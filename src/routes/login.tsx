import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LoaderCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogClient } from "@/lib/product-catalog";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — SmartLar Hub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const { error } = await catalogClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await navigate({ to: "/" });
    } catch {
      setErrorMessage("Não foi possível entrar. Confira o e-mail e a senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 border border-border bg-card p-8 shadow-sm">
        <div><h1 className="text-2xl font-extrabold">Entrar no SmartLar Hub</h1><p className="mt-2 text-sm text-muted-foreground">Acesse sua conta para consultar os dados comerciais.</p></div>
        <div><Label htmlFor="login-email">E-mail</Label><Input id="login-email" className="mt-2" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <div><Label htmlFor="login-password">Senha</Label><Input id="login-password" className="mt-2" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <LoaderCircle className="animate-spin" /> : <LogIn />} Entrar</Button>
      </form>
    </main>
  );
}
