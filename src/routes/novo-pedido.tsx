import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, PackagePlus, Plus, ReceiptText, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Product } from "@/lib/product-catalog";
import { customerSchema, orderSchema, ordersClient, type Customer } from "@/lib/orders";

export const Route = createFileRoute("/novo-pedido")({
  head: () => ({ meta: [
    { title: "Novo Pedido — SmartLar Hub" },
    { name: "description", content: "Crie orçamentos com clientes, produtos e cálculo automático." },
    { property: "og:title", content: "Novo Pedido — SmartLar Hub" },
    { property: "og:description", content: "Crie orçamentos com clientes, produtos e cálculo automático." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NewOrderPage,
});

type OrderLine = { key: string; produto_id: string; quantidade: string };
type CustomerForm = { nome: string; telefone: string; email: string; endereco: string };
const emptyCustomer: CustomerForm = { nome: "", telefone: "", email: "", endereco: "" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let lineSequence = 0;
const newLine = (): OrderLine => ({ key: `line-${++lineSequence}`, produto_id: "", quantidade: "1" });

function NewOrderPage() {
  const navigate = useNavigate({ from: "/novo-pedido" });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([newLine()]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [customerError, setCustomerError] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  async function loadOptions() {
    setLoading(true);
    setLoadError("");
    const [customerResult, productResult] = await Promise.all([
      ordersClient.from("clientes").select("id,nome,telefone,email,endereco").order("nome"),
      ordersClient.from("produtos").select("id,nome,categoria,preco_unitario,descricao").order("categoria").order("nome"),
    ]);
    if (customerResult.error || productResult.error) {
      setLoadError("Não foi possível carregar clientes e produtos. Tente novamente.");
    } else {
      setCustomers((customerResult.data ?? []) as Customer[]);
      setProducts((productResult.data ?? []) as Product[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadOptions(); }, []);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const calculatedLines = useMemo(() => lines.map((line) => {
    const product = productMap.get(line.produto_id);
    const quantity = Number(line.quantidade);
    const validQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
    return { ...line, product, subtotal: product ? Number(product.preco_unitario) * validQuantity : 0 };
  }), [lines, productMap]);
  const total = useMemo(() => calculatedLines.reduce((sum, line) => sum + line.subtotal, 0), [calculatedLines]);

  function updateLine(key: string, patch: Partial<OrderLine>) {
    setFormError("");
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function removeLine(key: string) {
    setFormError("");
    setLines((current) => current.length === 1 ? [newLine()] : current.filter((line) => line.key !== key));
  }

  async function handleCustomerCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerError("");
    const parsed = customerSchema.safeParse(customerForm);
    if (!parsed.success) {
      setCustomerError(parsed.error.issues[0]?.message ?? "Revise os dados do cliente.");
      return;
    }
    setSavingCustomer(true);
    const { data, error } = await ordersClient.from("clientes").insert(parsed.data).select("id,nome,telefone,email,endereco").single();
    setSavingCustomer(false);
    if (error || !data) {
      setCustomerError("Não foi possível cadastrar o cliente.");
      return;
    }
    const customer = data as Customer;
    setCustomers((current) => [...current, customer].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    setCustomerId(customer.id);
    setCustomerForm(emptyCustomer);
    setCustomerOpen(false);
    toast.success("Cliente cadastrado e selecionado.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const items = calculatedLines.map((line) => ({
      produto_id: line.produto_id,
      quantidade: line.quantidade,
      preco_unitario: Number(line.product?.preco_unitario ?? 0),
    }));
    const parsed = orderSchema.safeParse({ cliente_id: customerId, observacoes: notes, itens: items });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os dados do orçamento.");
      return;
    }
    if (new Set(parsed.data.itens.map((item) => item.produto_id)).size !== parsed.data.itens.length) {
      setFormError("Cada produto deve aparecer apenas uma vez. Ajuste a quantidade na linha existente.");
      return;
    }

    setSaving(true);
    const orderTotal = parsed.data.itens.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);
    const { data: order, error: orderError } = await ordersClient.from("pedidos").insert({
      cliente_id: parsed.data.cliente_id,
      tecnico_id: null,
      status: "orcamento",
      valor_total: orderTotal,
      observacoes: parsed.data.observacoes || null,
    }).select("id").single();

    if (orderError || !order) {
      setSaving(false);
      setFormError("Não foi possível salvar o orçamento.");
      return;
    }

    const orderItems = parsed.data.itens.map((item) => ({
      pedido_id: order.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    }));
    const { error: itemsError } = await ordersClient.from("itens_pedido").insert(orderItems);
    if (itemsError) {
      await ordersClient.from("pedidos").delete().eq("id", order.id);
      setSaving(false);
      setFormError("Não foi possível salvar os itens. Nenhum orçamento incompleto foi mantido.");
      return;
    }

    setSaving(false);
    window.sessionStorage.setItem("smartlar-hub-order-created", "1");
    await navigate({ to: "/pedidos" });
  }

  if (loading) {
    return <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-muted-foreground"><LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando dados do pedido...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-primary">Orçamento</p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Criar Novo Pedido</h1>
          <p className="mt-3 text-sm text-muted-foreground">Selecione o cliente e monte os itens do orçamento.</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary px-4 py-3">
          <ReceiptText className="size-5 text-primary" aria-hidden="true" />
          <div><p className="text-[11px] font-bold uppercase text-muted-foreground">Total do orçamento</p><p className="text-xl font-extrabold text-foreground">{money.format(total)}</p></div>
        </div>
      </header>

      {loadError ? <div className="mt-6 border border-destructive/30 bg-card p-6 text-center"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" className="mt-4" onClick={() => void loadOptions()}>Tentar novamente</Button></div> : (
        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          <section aria-labelledby="customer-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div><h2 id="customer-title" className="text-lg font-extrabold">Cliente</h2><p className="mt-1 text-sm text-muted-foreground">Escolha quem receberá o orçamento.</p></div>
              <Button type="button" variant="outline" onClick={() => { setCustomerError(""); setCustomerOpen(true); }}><UserPlus /> Novo cliente</Button>
            </div>
            <div className="max-w-xl">
              <Label htmlFor="customer">Cliente cadastrado</Label>
              <Select value={customerId} onValueChange={(value) => { setCustomerId(value); setFormError(""); }}>
                <SelectTrigger id="customer" className="mt-2 h-11 bg-card"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </section>

          <section className="border-t border-border pt-8" aria-labelledby="items-title">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div><h2 id="items-title" className="text-lg font-extrabold">Produtos</h2><p className="mt-1 text-sm text-muted-foreground">Adicione os produtos e informe suas quantidades.</p></div>
              <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, newLine()])}><PackagePlus /> Adicionar produto</Button>
            </div>
            <div className="space-y-3">
              {calculatedLines.map((line, index) => (
                <div key={line.key} className="grid gap-4 border border-border bg-card p-4 shadow-sm lg:grid-cols-[minmax(240px,1fr)_120px_150px_150px_40px] lg:items-end">
                  <div><Label htmlFor={`product-${line.key}`}>Produto {index + 1}</Label><Select value={line.produto_id} onValueChange={(value) => updateLine(line.key, { produto_id: value })}><SelectTrigger id={`product-${line.key}`} className="mt-2 h-10"><SelectValue placeholder="Selecione um produto" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.nome} · {product.categoria}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor={`quantity-${line.key}`}>Quantidade</Label><Input id={`quantity-${line.key}`} className="mt-2 h-10" type="number" inputMode="numeric" min="1" max="999" step="1" value={line.quantidade} onChange={(event) => updateLine(line.key, { quantidade: event.target.value })} /></div>
                  <div><p className="text-xs font-medium text-muted-foreground">Preço unitário</p><p className="mt-3 h-10 pt-2 text-sm font-bold">{line.product ? money.format(Number(line.product.preco_unitario)) : "—"}</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground">Subtotal</p><p className="mt-3 h-10 pt-2 text-base font-extrabold text-primary">{money.format(line.subtotal)}</p></div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover produto ${index + 1}`} onClick={() => removeLine(line.key)}><Trash2 /></Button>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 border-t border-border pt-8 lg:grid-cols-[1fr_360px]">
            <div><Label htmlFor="notes">Observações</Label><Textarea id="notes" className="mt-2 min-h-32 bg-card" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhes adicionais do orçamento..." /><p className="mt-2 text-right text-xs text-muted-foreground">{notes.length}/1000</p></div>
            <div className="border-l-4 border-primary bg-card p-5 shadow-sm"><p className="text-xs font-bold uppercase text-muted-foreground">Valor total</p><p className="mt-2 text-3xl font-extrabold text-foreground">{money.format(total)}</p><p className="mt-2 text-xs text-muted-foreground">{calculatedLines.filter((line) => line.product).length} {calculatedLines.filter((line) => line.product).length === 1 ? "produto selecionado" : "produtos selecionados"}</p></div>
          </section>

          {formError ? <p className="border-l-4 border-destructive bg-card px-4 py-3 text-sm text-destructive" role="alert">{formError}</p> : null}
          <div className="flex justify-end border-t border-border pt-6"><Button type="submit" size="lg" disabled={saving || !customers.length || !products.length}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />} Salvar Orçamento</Button></div>
        </form>
      )}

      <Dialog open={customerOpen} onOpenChange={(open) => { setCustomerOpen(open); if (!open) setCustomerError(""); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle><DialogDescription>O novo cliente ficará selecionado neste orçamento.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={handleCustomerCreate}>
            <div><Label htmlFor="new-customer-name">Nome</Label><Input id="new-customer-name" className="mt-2" maxLength={120} value={customerForm.nome} onChange={(e) => setCustomerForm({ ...customerForm, nome: e.target.value })} required /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="new-customer-phone">Telefone</Label><Input id="new-customer-phone" className="mt-2" maxLength={30} value={customerForm.telefone} onChange={(e) => setCustomerForm({ ...customerForm, telefone: e.target.value })} required /></div><div><Label htmlFor="new-customer-email">E-mail</Label><Input id="new-customer-email" className="mt-2" type="email" maxLength={255} value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} required /></div></div>
            <div><Label htmlFor="new-customer-address">Endereço</Label><Input id="new-customer-address" className="mt-2" maxLength={300} value={customerForm.endereco} onChange={(e) => setCustomerForm({ ...customerForm, endereco: e.target.value })} required /></div>
            {customerError ? <p className="text-sm text-destructive" role="alert">{customerError}</p> : null}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCustomerOpen(false)}>Cancelar</Button><Button type="submit" disabled={savingCustomer}>{savingCustomer ? <LoaderCircle className="animate-spin" /> : <Plus />} Cadastrar cliente</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
