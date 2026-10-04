import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function isBrowserSafeKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;

  // Legacy anon keys are JWTs. Never allow a service_role key into the browser.
  const parts = key.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(atob(paddedPayload)).role === "anon";
  } catch {
    return false;
  }
}

function createCatalogClient() {
  const catalogUrl = import.meta.env["VITE_CATALOG_SUPABASE_URL"]?.trim();
  const catalogPublishableKey = import.meta.env["VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY"]?.trim();

  if (!catalogUrl || !catalogPublishableKey) {
    throw new Error(
      "Configure VITE_CATALOG_SUPABASE_URL e VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY para acessar os dados comerciais.",
    );
  }

  if (!isBrowserSafeKey(catalogPublishableKey)) {
    throw new Error("Use uma chave pública publishable ou anon para o catálogo Supabase.");
  }

  return createClient(catalogUrl, catalogPublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let catalogInstance: ReturnType<typeof createCatalogClient> | undefined;

// Defer configuration until the first query so route imports do not require env.
export const catalogClient = new Proxy({} as ReturnType<typeof createCatalogClient>, {
  get(_target, property) {
    catalogInstance ??= createCatalogClient();
    const value = Reflect.get(catalogInstance, property, catalogInstance);
    return typeof value === "function" ? value.bind(catalogInstance) : value;
  },
});

export const productSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120),
  categoria: z.string().trim().min(2, "Informe a categoria.").max(80),
  preco_unitario: z.coerce
    .number({ invalid_type_error: "Informe um preço válido." })
    .finite("Informe um preço válido.")
    .positive("O preço deve ser maior que zero.")
    .max(99999999.99, "O preço informado é muito alto."),
  descricao: z.string().trim().min(2, "Informe uma descrição.").max(500),
});

export const priceSchema = z.object({
  preco_unitario: z.coerce
    .number({ invalid_type_error: "Informe um preço válido." })
    .finite("Informe um preço válido.")
    .positive("O preço deve ser maior que zero.")
    .max(99999999.99, "O preço informado é muito alto."),
});

export type Product = {
  id: string;
  nome: string;
  categoria: string;
  preco_unitario: number;
  descricao: string | null;
};
