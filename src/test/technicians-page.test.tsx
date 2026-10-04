import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TechniciansPage } from "@/components/technicians-page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const technician = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Ana Técnica",
  telefone: "11988887777",
  especialidade: "Câmeras",
};
const requests: { method: string; url: URL; body: unknown }[] = [];
let client: QueryClient;
let rejection: string | null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requests.length = 0;
  rejection = null;
  vi.stubEnv("VITE_CATALOG_SUPABASE_URL", "https://catalog-tests.example.test");
  vi.stubEnv("VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_fixture_not_a_real_key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      requests.push({ method, url, body });
      if (
        url.origin !== "https://catalog-tests.example.test" ||
        url.pathname !== "/rest/v1/tecnicos"
      )
        throw new Error("Unexpected backend");
      if (method === "GET") return json([technician]);
      if (rejection)
        return json(
          { code: rejection, message: "Database error" },
          rejection === "23503" ? 409 : 403,
        );
      if (method === "DELETE") return json({ id: technician.id });
      return json({ ...technician, ...body });
    }),
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function renderPage() {
  return render(
    <QueryClientProvider client={client}>
      <TechniciansPage />
    </QueryClientProvider>,
  );
}

describe("Gestão de técnicos", () => {
  it("lista o telefone com máscara e cadastra um técnico pelo modal", async () => {
    renderPage();
    expect(await screen.findByText("(11) 98888-7777")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Novo Técnico" }));
    const dialog = await screen.findByRole("dialog", { name: "Novo Técnico" });
    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "  Bruno Técnico  " },
    });
    fireEvent.change(within(dialog).getByLabelText("Telefone"), {
      target: { value: "82987654321" },
    });
    fireEvent.change(within(dialog).getByLabelText("Especialidade"), {
      target: { value: "Sensores" },
    });
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar técnico" }).closest("form")!,
    );
    expect(await screen.findByText("Bruno Técnico")).toBeVisible();
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({
      nome: "Bruno Técnico",
      telefone: "(82) 98765-4321",
      especialidade: "Sensores",
    });
    expect(toast.success).toHaveBeenCalledWith("Técnico cadastrado com sucesso.");
  });

  it("preenche o modal e atualiza somente o técnico selecionado", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: `Editar ${technician.nome}` }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Técnico" });
    expect(within(dialog).getByLabelText("Nome")).toHaveValue(technician.nome);
    expect(within(dialog).getByLabelText("Telefone")).toHaveValue("(11) 98888-7777");
    expect(within(dialog).getByLabelText("Especialidade")).toHaveValue("Câmeras");
    fireEvent.change(within(dialog).getByLabelText("Especialidade"), {
      target: { value: "Automação" },
    });
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar técnico" }).closest("form")!,
    );
    expect(await screen.findByText("Automação")).toBeVisible();
    const update = requests.find((request) => request.method === "PATCH");
    expect(update?.url.searchParams.get("id")).toBe(`eq.${technician.id}`);
    expect(update?.body).toMatchObject({ especialidade: "Automação" });
  });

  it("exige confirmação e remove da lista após o DELETE", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: `Remover ${technician.nome}` }));
    const dialog = await screen.findByRole("alertdialog");
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));
    expect(await screen.findByRole("heading", { name: "Nenhum técnico cadastrado" })).toBeVisible();
    expect(
      requests.find((request) => request.method === "DELETE")?.url.searchParams.get("id"),
    ).toBe(`eq.${technician.id}`);
    expect(toast.success).toHaveBeenCalledWith("Técnico removido com sucesso.");
  });

  it.each([
    ["23503", "Não é possível remover este técnico pois ele já possui atendimentos registrados."],
    ["42501", "Não foi possível remover o técnico. Tente novamente."],
  ])("preserva o técnico e mostra o erro %s", async (code, message) => {
    rejection = code;
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: `Remover ${technician.nome}` }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText(technician.nome)).toBeVisible();
  });
});
