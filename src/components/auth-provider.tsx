import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { catalogClient } from "@/lib/product-catalog";
import { AuthContext } from "@/components/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authEventOccurred = false;
    const { data: { subscription } } = catalogClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (active) {
        authEventOccurred = true;
        if (event === "SIGNED_OUT") queryClient.clear();
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    void catalogClient.auth.getUser().then(({ data, error }) => {
      if (!active || authEventOccurred) return;
      setUser(error ? null : data.user);
      setLoading(false);
    }).catch(() => {
      if (active && !authEventOccurred) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient]);

  async function signOut() {
    const { error } = await catalogClient.auth.signOut();
    if (error) throw error;
    queryClient.clear();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}
