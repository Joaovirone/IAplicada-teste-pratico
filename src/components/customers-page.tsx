import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronRight, LoaderCircle, Plus, ReceiptText, Search, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomer,
  updateCustomer,
  fetchCustomerOrders,
  fetchCustomers,
  matchesCustomer,
  newCustomerSchema,
  type CustomerRecord,
  type NewCustomer,
} from "@/lib/customers";
import { orderStatusLabels } from "@/lib/order-status";
import { formatPhone } from "@/lib/phone";

const customersKey = ["customers"] as const;
const emptyForm: NewCustomer = { nome: "", telefone: "", email: "", endereco: "" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR");

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewCustomer>(emptyForm);
  const [formError, setFormError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const submitting = useRef(false);
  const customerTrigger = useRef<HTMLButtonElement | null>(null);

  const customersQuery = useQuery({
    queryKey: customersKey,
    queryFn: ({ signal }) => fetchCustomers(signal),
    retry: false,
  });
  const saveMutation = useMutation({
    mutationFn: ({ input, id }: { input: NewCustomer; id?: string }) =>
      id ? updateCustomer(id, input) : createCustomer(input),
    onSuccess: async (customer, { id }) => {
      await queryClient.cancelQueries({ queryKey: customersKey });
      queryClient.setQueryData<CustomerRecord[]>(customersKey, (current = []) =>
        [...current.filter((item) => item.id !== customer.id), customer].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setCreateOpen(false);
      setForm(emptyForm);
      setSearch("");
      setEditingCustomer(null);
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(customer);
      toast.success(id ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      void queryClient.invalidateQueries({ queryKey: customersKey });
    },
    onError: (_error, { id }) => {
      setFormError(
        id
          ? "Não foi possível atualizar o cliente. Verifique sua conexão e tente novamente."
          : "Não foi possível cadastrar o cliente. Verifique sua conexão e tente novamente.",
      );
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const filteredCustomers = useMemo(
    () => (customersQuery.data ?? []).filter((customer) => matchesCustomer(customer, search)),
    [customersQuery.data, search],
  );
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setFormError("");
    const parsed = newCustomerSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os dados do cliente.");
      return;
    }
    submitting.current = true;
    saveMutation.mutate({
      input: parsed.data,
      ...(editingCustomer ? { id: editingCustomer.id } : {}),
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold text-primary">SmartLar Hub</p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Clientes</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Cadastre clientes e acompanhe o histórico de pedidos de cada um.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            if (submitting.current) return;
            setCreateOpen(open);
            setFormError("");
            if (!open) {
              setForm(emptyForm);
              setEditingCustomer(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setForm(emptyForm);
                setFormError("");
              }}
            >
              <Plus aria-hidden="true" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>
                Informe os dados de contato e o endereço da instalação. O e-mail é opcional.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit} aria-busy={saveMutation.isPending}>
              <fieldset className="space-y-4" disabled={saveMutation.isPending}>
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome</Label>
                  <Input
                    id="client-name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.nome}
                    onChange={(event) => setForm({ ...form, nome: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength={15}
                    inputMode="tel"
                    placeholder="(82) 98765-4321"
                    value={form.telefone}
                    onChange={(event) =>
                      setForm({ ...form, telefone: formatPhone(event.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail (opcional)</Label>
                  <Input
                    id="client-email"
                    type="email"
                    autoComplete="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-address">Endereço</Label>
                  <Textarea
                    id="client-address"
                    autoComplete="street-address"
                    required
                    minLength={5}
                    maxLength={300}
                    placeholder="Rua, número, complemento, bairro e cidade"
                    value={form.endereco}
                    onChange={(event) => setForm({ ...form, endereco: event.target.value })}
                  />
                </div>
              </fieldset>
              {formError ? (
                <p
                  role="alert"
                  className="border-l-4 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  {formError}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    setCreateOpen(false);
                    setForm(emptyForm);
                    setFormError("");
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {saveMutation.isPending ? "Salvando..." : "Salvar cliente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Label htmlFor="customer-search" className="sr-only">
            Buscar por nome ou telefone
          </Label>
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="customer-search"
            type="search"
            placeholder="Buscar por nome ou telefone"
            className="h-10 bg-card pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {!customersQuery.isPending && !customersQuery.isError ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredCustomers.length}{" "}
            {filteredCustomers.length === 1 ? "cliente encontrado" : "clientes encontrados"}
          </p>
        ) : null}
      </div>

      <section
        className="mt-5 border border-border bg-card shadow-sm"
        aria-label="Lista de clientes"
        aria-busy={customersQuery.isFetching}
      >
        {customersQuery.isPending ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Carregando
            clientes...
          </div>
        ) : customersQuery.isError ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar os clientes. Verifique sua conexão e tente novamente.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              disabled={customersQuery.isFetching}
              onClick={() => void customersQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 font-bold">
              {search.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {search.trim()
                ? "Tente outro nome ou número de telefone."
                : "Use Novo Cliente para fazer o primeiro cadastro."}
            </p>
          </div>
        ) : (
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>
                  <span className="sr-only">Pedidos</span>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    customerTrigger.current = event.currentTarget.querySelector("button");
                    setSelectedCustomer(customer);
                  }}
                >
                  <TableCell>
                    <button
                      type="button"
                      className="rounded-sm text-left font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Ver pedidos de ${customer.nome}`}
                    >
                      {customer.nome}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatPhone(customer.telefone ?? "") || "—"}
                  </TableCell>
                  <TableCell className="break-all text-muted-foreground">
                    {customer.email || "—"}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                    {customer.endereco || "—"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar ${customer.nome}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingCustomer(customer);
                        setForm({
                          nome: customer.nome,
                          telefone: formatPhone(customer.telefone ?? ""),
                          email: customer.email ?? "",
                          endereco: customer.endereco ?? "",
                        });
                        setFormError("");
                        setCreateOpen(true);
                      }}
                    >
                      <Pencil aria-hidden="true" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Sheet
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null);
        }}
      >
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            customerTrigger.current?.focus();
          }}
        >
          <SheetHeader className="pr-6 text-left">
            <SheetTitle>Pedidos de {selectedCustomer?.nome}</SheetTitle>
            <SheetDescription>
              Histórico de pedidos deste cliente, do mais recente para o mais antigo.
            </SheetDescription>
          </SheetHeader>
          {selectedCustomer ? <CustomerOrders customer={selectedCustomer} /> : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function CustomerOrders({ customer }: { customer: CustomerRecord }) {
  const ordersQuery = useQuery({
    queryKey: ["customer-orders", customer.id],
    queryFn: ({ signal }) => fetchCustomerOrders(customer.id, signal),
    retry: false,
  });
  return (
    <div className="mt-6 space-y-6">
      <dl className="space-y-3 border border-border bg-card p-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Telefone</dt>
          <dd className="mt-1">{formatPhone(customer.telefone ?? "") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">E-mail</dt>
          <dd className="mt-1 break-all">{customer.email || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Endereço da instalação</dt>
          <dd className="mt-1">{customer.endereco || "—"}</dd>
        </div>
      </dl>
      {ordersQuery.isPending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Carregando pedidos...
        </p>
      ) : ordersQuery.isError ? (
        <div>
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar os pedidos deste cliente.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            disabled={ordersQuery.isFetching}
            onClick={() => void ordersQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : ordersQuery.data.length === 0 ? (
        <div className="py-8 text-center">
          <ReceiptText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Este cliente ainda não possui pedidos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Histórico de pedidos">
          {ordersQuery.data.map((order) => (
            <li key={order.id} className="space-y-3 border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">{orderStatusLabels[order.status] ?? order.status}</Badge>
                <span className="text-lg font-extrabold">
                  {money.format(Number(order.valor_total))}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID do pedido</p>
                <p className="mt-1 break-all font-mono text-xs">{order.id}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Criado em {date.format(new Date(order.created_at))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
