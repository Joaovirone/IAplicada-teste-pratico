import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { CustomersPage } from "@/components/customers-page";
import type { CustomerRecord, NewCustomer } from "@/lib/customers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const joao: CustomerRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "João da Silva",
  telefone: "11977774321",
  email: "joao@example.test",
  endereco: "Rua das Flores, 10",
  created_at: "2026-10-01T12:00:00Z",
};
const ana: CustomerRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Ana Costa",
  telefone: "(82) 98888-1234",
  email: null,
  endereco: "Rua do Sol, 20",
  created_at: "2026-10-02T12:00:00Z",
};
const julia: CustomerRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  nome: "Júlia Prado",
  telefone: "(82) 99999-8765",
  email: "julia@example.test",
  endereco: "Rua Nova, 30",
  created_at: "2026-10-04T12:00:00Z",
};

type RecordedRequest = { url: URL; method: string; body: unknown };
type Reply = Response | Promise<Response>;
const requests: RecordedRequest[] = [];
const clients: QueryClient[] = [];
const fetchMock = vi.fn<typeof fetch>();
let listReply: () => Reply;
let insertReply: (body: NewCustomer) => Reply;
let ordersReply: (url: URL) => Reply;
let updateReply: (body: NewCustomer) => Reply;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <CustomersPage />
    </QueryClientProvider>,
  );
}

async function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "Novo Cliente" }));
  const dialog = await screen.findByRole("dialog", { name: "Novo Cliente" });
  fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "  Júlia Prado  " } });
  fireEvent.change(within(dialog).getByLabelText("Telefone"), {
    target: { value: julia.telefone },
  });
  fireEvent.change(within(dialog).getByLabelText("E-mail (opcional)"), {
    target: { value: julia.email },
  });
  fireEvent.change(within(dialog).getByLabelText("Endereço"), {
    target: { value: "  Rua Nova, 30  " },
  });
  return dialog;
}

beforeEach(() => {
  requests.length = 0;
  vi.clearAllMocks();
  // Only synthetic public configuration is used; every request is intercepted.
  vi.stubEnv("VITE_CATALOG_SUPABASE_URL", "https://catalog-tests.example.test");
  vi.stubEnv("VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_fixture_not_a_real_key");
  listReply = () => json([ana, joao]);
  insertReply = () => json(julia, 201);
  ordersReply = () => json([]);
  updateReply = (body) => json({ ...joao, ...body });
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ url, method, body });
    if (url.origin !== "https://catalog-tests.example.test") {
      throw new Error("Unexpected backend: tests must never contact a real Supabase project.");
    }
    if (url.pathname === "/rest/v1/clientes" && method === "GET") return listReply();
    if (url.pathname === "/rest/v1/clientes" && method === "POST")
      return insertReply(body as NewCustomer);
    if (url.pathname === "/rest/v1/clientes" && method === "PATCH")
      return updateReply(body as NewCustomer);
    if (url.pathname === "/rest/v1/pedidos" && method === "GET") return ordersReply(url);
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Clientes", () => {
  it("limita e mascara o telefone e rejeita números repetidos antes de enviar", async () => {
    renderPage();
    const dialog = await openForm();
    const phone = within(dialog).getByLabelText("Telefone");
    fireEvent.change(phone, { target: { value: "abc8298765432112345" } });
    expect(phone).toHaveValue("(82) 98765-4321");
    expect(phone).toHaveAttribute("maxlength", "15");
    fireEvent.change(phone, { target: { value: "82900000000" } });
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar cliente" }).closest("form")!,
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "sem sequência de dígitos repetidos",
    );
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("formata telefones antigos, edita por id e não oferece exclusão", async () => {
    renderPage();
    const edit = await screen.findByRole("button", { name: `Editar ${joao.nome}` });
    expect(screen.getByText("(11) 97777-4321")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    fireEvent.click(edit);
    const dialog = await screen.findByRole("dialog", { name: "Editar Cliente" });
    expect(
      screen.queryByRole("dialog", { name: `Pedidos de ${joao.nome}` }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nome")).toHaveValue(joao.nome);
    expect(within(dialog).getByLabelText("Telefone")).toHaveValue("(11) 97777-4321");
    expect(within(dialog).getByLabelText("E-mail (opcional)")).toHaveValue(joao.email);
    expect(within(dialog).getByLabelText("Endereço")).toHaveValue(joao.endereco);
    fireEvent.change(within(dialog).getByLabelText("Nome"), {
      target: { value: "João Atualizado" },
    });
    listReply = () => json([ana, { ...joao, nome: "João Atualizado" }]);
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar cliente" }).closest("form")!,
    );
    expect(await screen.findByRole("button", { name: "Editar João Atualizado" })).toBeVisible();
    const update = requests.find((request) => request.method === "PATCH");
    expect(update?.url.searchParams.get("id")).toBe(`eq.${joao.id}`);
    expect(update?.body).toMatchObject({ nome: "João Atualizado", telefone: "(11) 97777-4321" });
    expect(toast.success).toHaveBeenCalledWith("Cliente atualizado com sucesso.");
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
  });

  it("mantém o formulário de edição se o Supabase rejeitar o UPDATE", async () => {
    updateReply = () => json({ code: "42501", message: "Permission denied" }, 403);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: `Editar ${joao.nome}` }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Cliente" });
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar cliente" }).closest("form")!,
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível atualizar o cliente.",
    );
    expect(within(dialog).getByLabelText("Nome")).toHaveValue(joao.nome);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("carrega clientes e busca nomes sem acentos ou telefones sem máscara", async () => {
    const pending = deferred<Response>();
    listReply = () => pending.promise;
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando clientes...");

    await act(async () => {
      pending.resolve(json([ana, joao]));
    });
    expect(
      await screen.findByRole("button", { name: `Ver pedidos de ${joao.nome}` }),
    ).toBeVisible();
    expect(requests[0]?.url.searchParams.get("select")).toBe(
      "id,nome,telefone,email,endereco,created_at",
    );
    const search = screen.getByRole("searchbox", { name: "Buscar por nome ou telefone" });

    fireEvent.change(search, { target: { value: "JOAO" } });
    expect(screen.getByRole("button", { name: `Ver pedidos de ${joao.nome}` })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: `Ver pedidos de ${ana.nome}` }),
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "988881234" } });
    expect(screen.getByRole("button", { name: `Ver pedidos de ${ana.nome}` })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: `Ver pedidos de ${joao.nome}` }),
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "Cliente inexistente" } });
    expect(screen.getByRole("heading", { name: "Nenhum cliente encontrado" })).toBeVisible();
  });

  it("insere os campos normalizados, bloqueia envio duplicado e atualiza a lista com toast", async () => {
    const pending = deferred<Response>();
    insertReply = () => pending.promise;
    renderPage();
    await screen.findByRole("button", { name: `Ver pedidos de ${joao.nome}` });
    const dialog = await openForm();
    const submit = within(dialog).getByRole("button", { name: "Salvar cliente" });
    const form = submit.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1),
    );
    expect(within(dialog).getByRole("button", { name: "Salvando..." })).toBeDisabled();
    fireEvent.submit(form);
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({
      nome: julia.nome,
      telefone: julia.telefone,
      email: julia.email,
      endereco: julia.endereco,
    });

    listReply = () => json([ana, joao, julia]);
    await act(async () => {
      pending.resolve(json(julia, 201));
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Novo Cliente" })).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("button", { name: `Ver pedidos de ${julia.nome}` }),
    ).toBeVisible();
    expect(toast.success).toHaveBeenCalledWith("Cliente cadastrado com sucesso.");
    await waitFor(() =>
      expect(
        requests.filter(
          (request) => request.url.pathname === "/rest/v1/clientes" && request.method === "GET",
        ),
      ).toHaveLength(2),
    );
  });

  it("preserva os dados do formulário se o Supabase rejeitar o cadastro", async () => {
    insertReply = () =>
      json({ code: "42501", message: "Permission denied", details: null, hint: null }, 403);
    renderPage();
    await screen.findByRole("button", { name: `Ver pedidos de ${joao.nome}` });
    const dialog = await openForm();
    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Salvar cliente" }).closest("form")!,
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível cadastrar o cliente.",
    );
    expect(dialog).toBeVisible();
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("  Júlia Prado  ");
    expect(within(dialog).getByLabelText("Telefone")).toHaveValue(julia.telefone);
    expect(within(dialog).getByLabelText("E-mail (opcional)")).toHaveValue(julia.email);
    expect(within(dialog).getByLabelText("Endereço")).toHaveValue("  Rua Nova, 30  ");
    expect(within(dialog).getByRole("button", { name: "Salvar cliente" })).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("abre o histórico com filtro cliente_id, status legível e valor em reais", async () => {
    const pending = deferred<Response>();
    ordersReply = () => pending.promise;
    renderPage();
    const trigger = await screen.findByRole("button", { name: `Ver pedidos de ${joao.nome}` });
    fireEvent.click(trigger);
    const panel = await screen.findByRole("dialog", { name: `Pedidos de ${joao.nome}` });
    expect(within(panel).getByRole("status")).toHaveTextContent("Carregando pedidos...");
    await waitFor(() =>
      expect(
        requests
          .find((request) => request.url.pathname === "/rest/v1/pedidos")
          ?.url.searchParams.get("cliente_id"),
      ).toBe(`eq.${joao.id}`),
    );

    const orderId = "44444444-4444-4444-8444-444444444444";
    await act(async () => {
      pending.resolve(
        json([
          {
            id: orderId,
            cliente_id: joao.id,
            status: "aprovado",
            valor_total: 1250.5,
            created_at: "2026-10-03T12:00:00Z",
          },
        ]),
      );
    });
    expect(await within(panel).findByText(orderId)).toBeVisible();
    expect(within(panel).getByText("Aprovado")).toBeVisible();
    expect(within(panel).getByText(/R\$\s*1\.250,50/)).toBeVisible();
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("permite tentar novamente após erro ao listar e apresenta o estado vazio", async () => {
    listReply = () => json({ message: "Permission denied", code: "42501" }, 403);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os clientes.",
    );
    listReply = () => json([]);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("heading", { name: "Nenhum cliente cadastrado" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests.filter((request) => request.method === "GET")).toHaveLength(2);
  });

  it("permite repetir a consulta de pedidos e informa quando o cliente não possui histórico", async () => {
    ordersReply = () => json({ message: "Permission denied", code: "42501" }, 403);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: `Ver pedidos de ${ana.nome}` }));
    const panel = await screen.findByRole("dialog", { name: `Pedidos de ${ana.nome}` });
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os pedidos deste cliente.",
    );
    ordersReply = () => json([]);
    fireEvent.click(within(panel).getByRole("button", { name: "Tentar novamente" }));

    expect(await within(panel).findByText("Este cliente ainda não possui pedidos.")).toBeVisible();
    const orderRequests = requests.filter((request) => request.url.pathname === "/rest/v1/pedidos");
    expect(orderRequests).toHaveLength(2);
    expect(
      orderRequests.every(
        (request) => request.url.searchParams.get("cliente_id") === `eq.${ana.id}`,
      ),
    ).toBe(true);
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
  });
});
