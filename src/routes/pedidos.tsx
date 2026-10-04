import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ordersClient,
  schedulingSchema,
  type Order,
  type OrderStatus,
  type Technician,
} from "@/lib/orders";
import { canAdvanceOrderStatus, canCancelOrder, nextOrderStatus, orderStatusLabels } from "@/lib/order-status";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [
    { title: "Gestão de Pedidos — SmartLar Hub" },
    { name: "description", content: "Acompanhe pedidos, instalações e avanços do fluxo comercial." },
    { property: "og:title", content: "Gestão de Pedidos — SmartLar Hub" },
    { property: "og:description", content: "Acompanhe pedidos, instalações e avanços do fluxo comercial." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OrdersPage,
});

const statuses: Array<{ value: "todos" | OrderStatus; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "orcamento", label: "Orçamento" },
  { value: "aprovado", label: "Aprovado" },
  { value: "agendado", label: "Agendado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const nextActionLabels: Partial<Record<OrderStatus, string>> = {
  orcamento: "Aprovar pedido",
  aprovado: "Agendar instalação",
  agendado: "Iniciar atendimento",
  em_andamento: "Concluir pedido",
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const orderQuery = "id,status,valor_total,forma_pagamento,observacoes,data_instalacao,created_at,updated_at,clientes(id,nome,telefone,email,endereco),tecnicos(id,nome,telefone,especialidade),itens_pedido(id,quantidade,preco_unitario,subtotal,produtos(id,nome,categoria))";

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    orcamento: "border-border bg-secondary text-secondary-foreground",
    aprovado: "border-primary/25 bg-primary/10 text-primary",
    agendado: "border-accent/40 bg-accent/15 text-accent-foreground",
    em_andamento: "border-primary/40 bg-primary/15 text-primary",
    concluido: "border-primary/30 bg-primary text-primary-foreground",
    cancelado: "border-destructive/25 bg-destructive/10 text-destructive",
  };
  return <Badge variant="outline" className={cn("whitespace-nowrap font-bold", styles[status])}>{orderStatusLabels[status]}</Badge>;
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Não definida";
  return format(new Date(value), includeTime ? "dd/MM/yyyy 'às' HH:mm" : "dd/MM/yyyy", { locale: ptBR });
}

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [filter, setFilter] = useState<"todos" | OrderStatus>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [technicianId, setTechnicianId] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const scheduleDate = installationDate ? new Date(installationDate) : null;
  const scheduleReady = Boolean(technicianId && scheduleDate && !Number.isNaN(scheduleDate.getTime()) && scheduleDate.getTime() > Date.now());

  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null;
  const filteredOrders = useMemo(
    () => filter === "todos" ? orders : orders.filter((order) => order.status === filter),
    [filter, orders],
  );
  const counts = useMemo(() => orders.reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, {}), [orders]);

  async function loadOrders() {
    setLoading(true);
    setLoadError("");
    const [ordersResult, techniciansResult] = await Promise.all([
      ordersClient.from("pedidos").select(orderQuery).order("created_at", { ascending: false }),
      ordersClient.from("tecnicos").select("id,nome,telefone,especialidade").order("nome"),
    ]);
    if (ordersResult.error || techniciansResult.error) {
      setLoadError("Não foi possível carregar os pedidos. Tente novamente.");
    } else {
      setOrders((ordersResult.data ?? []) as unknown as Order[]);
      setTechnicians((techniciansResult.data ?? []) as Technician[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadOrders();
    if (window.sessionStorage.getItem("smartlar-hub-order-created") === "1") {
      window.sessionStorage.removeItem("smartlar-hub-order-created");
      toast.success("Orçamento salvo com sucesso.");
    }
  }, []);

  function replaceOrder(updated: Order) {
    setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
  }

  async function fetchUpdatedOrder(id: string) {
    const { data, error } = await ordersClient.from("pedidos").select(orderQuery).eq("id", id).single();
    if (error || !data) return null;
    return data as unknown as Order;
  }

  async function changeStatus(target: OrderStatus, scheduling?: { technician: string; date: Date }) {
    if (!selectedOrder || updating) return;
    if (target === "agendado" && (!scheduling || !schedulingSchema.safeParse({ tecnico_id: scheduling.technician, data_instalacao: scheduling.date }).success)) return;
    setUpdating(true);
    const { data: persisted, error: checkError } = await ordersClient
      .from("pedidos")
      .select("status")
      .eq("id", selectedOrder.id)
      .single();
    const current = persisted?.status as OrderStatus | undefined;
    const transitionAllowed = current !== undefined && (target === "cancelado"
      ? canCancelOrder(current)
      : canAdvanceOrderStatus(current, target));
    if (checkError || !current || !transitionAllowed) {
      setUpdating(false);
      toast.error("O status foi alterado em outro acesso. Atualize a lista e tente novamente.");
      await loadOrders();
      return;
    }

    const patch: { status: OrderStatus; tecnico_id?: string; data_instalacao?: string } = { status: target };
    if (scheduling) {
      patch.tecnico_id = scheduling.technician;
      patch.data_instalacao = scheduling.date.toISOString();
    }
    const { data: changed, error } = await ordersClient.from("pedidos").update(patch).eq("id", selectedOrder.id).eq("status", current).select("id").maybeSingle();
    if (error || !changed) {
      setUpdating(false);
      toast.error("Não foi possível atualizar o pedido. Atualize a lista e tente novamente.");
      await loadOrders();
      return;
    }
    const updated = await fetchUpdatedOrder(selectedOrder.id);
    setUpdating(false);
    if (!updated) {
      toast.error("O pedido foi atualizado, mas os detalhes não puderam ser recarregados.");
      await loadOrders();
      return;
    }
    replaceOrder(updated);
    setScheduleOpen(false);
    setCancelOpen(false);
    setTechnicianId("");
    setInstallationDate("");
    toast.success(target === "cancelado" ? "Pedido cancelado." : `Pedido atualizado para ${orderStatusLabels[target].toLowerCase()}.`);
  }

  function handleAdvance() {
    if (!selectedOrder) return;
    const target = nextOrderStatus[selectedOrder.status];
    if (!target) return;
    if (target === "agendado") {
      setScheduleError("");
      setScheduleOpen(true);
      return;
    }
    void changeStatus(target);
  }

  function handleSchedule() {
    const parsed = schedulingSchema.safeParse({ tecnico_id: technicianId, data_instalacao: scheduleDate });
    if (!parsed.success) {
      setScheduleError(parsed.error.issues[0]?.message ?? "Preencha os dados do agendamento.");
      return;
    }
    setScheduleError("");
    void changeStatus("agendado", { technician: parsed.data.tecnico_id, date: parsed.data.data_instalacao });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-primary">Operação</p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Gestão de Pedidos</h1>
          <p className="mt-3 text-sm text-muted-foreground">Acompanhe cada pedido do orçamento à conclusão.</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary px-4 py-3">
          <ClipboardList className="size-5 text-primary" aria-hidden="true" />
          <div><p className="text-[11px] font-bold uppercase text-muted-foreground">Pedidos registrados</p><p className="text-xl font-extrabold text-foreground">{orders.length}</p></div>
        </div>
      </header>

      <section className="mt-7" aria-label="Filtros por status">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map((status) => {
            const count = status.value === "todos" ? orders.length : (counts[status.value] ?? 0);
            return (
              <Button
                key={status.value}
                type="button"
                variant={filter === status.value ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setFilter(status.value)}
              >
                {status.label}<span className={cn("ml-1 text-xs", filter === status.value ? "text-primary-foreground/75" : "text-muted-foreground")}>{count}</span>
              </Button>
            );
          })}
        </div>
      </section>

      {loadError ? (
        <Alert variant="destructive" className="mt-6">
          <CircleAlert className="size-4" /><AlertDescription className="flex flex-wrap items-center justify-between gap-3">{loadError}<Button variant="outline" size="sm" onClick={() => void loadOrders()}><RefreshCw /> Tentar novamente</Button></AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="mt-6 border border-dashed border-border py-16 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-bold text-foreground">Nenhum pedido neste status</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha outro filtro para consultar os pedidos.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden border border-border bg-card">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor total</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedId(order.id)}>
                    <TableCell className="font-bold text-foreground">{shortId(order.id)}</TableCell>
                    <TableCell>{order.clientes?.nome ?? "Cliente não encontrado"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right font-bold">{money.format(Number(order.valor_total))}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" aria-label={`Ver pedido ${shortId(order.id)}`}><ArrowRight /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {filteredOrders.map((order) => (
              <button key={order.id} type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50" onClick={() => setSelectedId(order.id)}>
                <div className="min-w-0"><p className="text-xs font-bold text-muted-foreground">{shortId(order.id)}</p><p className="mt-1 truncate font-bold text-foreground">{order.clientes?.nome ?? "Cliente não encontrado"}</p><div className="mt-2"><StatusBadge status={order.status} /></div></div>
                <div className="shrink-0 text-right"><p className="font-extrabold text-foreground">{money.format(Number(order.valor_total))}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(order.created_at)}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Sheet open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open && !scheduleOpen && !cancelOpen) setSelectedId(null); }}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {selectedOrder && (
            <>
              <SheetHeader className="border-b border-border px-6 py-6 text-left">
                <div className="flex items-center gap-3 pr-8"><SheetTitle className="text-xl">Pedido {shortId(selectedOrder.id)}</SheetTitle><StatusBadge status={selectedOrder.status} /></div>
                <SheetDescription>Criado em {formatDate(selectedOrder.created_at, true)}</SheetDescription>
              </SheetHeader>

              <div className="space-y-7 px-6 py-6">
                <section aria-labelledby="client-detail-title">
                  <h3 id="client-detail-title" className="mb-3 text-xs font-extrabold uppercase text-muted-foreground">Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-start gap-2 font-bold text-foreground"><UserRound className="mt-0.5 size-4 text-primary" />{selectedOrder.clientes?.nome ?? "Cliente não encontrado"}</p>
                    {selectedOrder.clientes?.telefone && <p className="flex items-start gap-2 text-muted-foreground"><Phone className="mt-0.5 size-4" />{selectedOrder.clientes.telefone}</p>}
                    {selectedOrder.clientes?.email && <p className="pl-6 text-muted-foreground">{selectedOrder.clientes.email}</p>}
                    {selectedOrder.clientes?.endereco && <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{selectedOrder.clientes.endereco}</p>}
                  </div>
                </section>

                <section className="border-t border-border pt-6" aria-labelledby="items-detail-title">
                  <h3 id="items-detail-title" className="mb-3 text-xs font-extrabold uppercase text-muted-foreground">Produtos</h3>
                  <div className="divide-y divide-border border-y border-border">
                    {selectedOrder.itens_pedido.map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 py-4">
                        <div><p className="font-bold text-foreground">{item.produtos?.nome ?? "Produto não encontrado"}</p><p className="mt-1 text-xs text-muted-foreground">{item.quantidade} × {money.format(Number(item.preco_unitario))}{item.produtos?.categoria ? ` · ${item.produtos.categoria}` : ""}</p></div>
                        <p className="font-bold text-foreground">{money.format(Number(item.subtotal))}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-end justify-between"><span className="text-sm font-bold text-muted-foreground">Valor total</span><span className="text-2xl font-extrabold text-foreground">{money.format(Number(selectedOrder.valor_total))}</span></div>
                </section>

                <section className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2" aria-label="Atendimento">
                  <div><h3 className="mb-2 text-xs font-extrabold uppercase text-muted-foreground">Técnico</h3><p className="flex items-start gap-2 text-sm font-bold text-foreground"><Wrench className="mt-0.5 size-4 text-primary" />{selectedOrder.tecnicos?.nome ?? "Não definido"}</p>{selectedOrder.tecnicos?.especialidade && <p className="mt-1 pl-6 text-xs text-muted-foreground">{selectedOrder.tecnicos.especialidade}</p>}</div>
                  <div><h3 className="mb-2 text-xs font-extrabold uppercase text-muted-foreground">Instalação</h3><p className="flex items-start gap-2 text-sm font-bold text-foreground"><CalendarDays className="mt-0.5 size-4 text-primary" />{formatDate(selectedOrder.data_instalacao, true)}</p></div>
                </section>

                <section className="border-t border-border pt-6" aria-labelledby="notes-detail-title">
                  <h3 id="notes-detail-title" className="mb-2 text-xs font-extrabold uppercase text-muted-foreground">Observações</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{selectedOrder.observacoes || "Nenhuma observação informada."}</p>
                </section>
              </div>

              <div className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
                {nextOrderStatus[selectedOrder.status] ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1" disabled={updating} onClick={handleAdvance}>{updating ? <LoaderCircle className="animate-spin" /> : selectedOrder.status === "em_andamento" ? <Check /> : <ArrowRight />}{nextActionLabels[selectedOrder.status]}</Button>
                    {canCancelOrder(selectedOrder.status) && <Button variant="outline" className="text-destructive hover:text-destructive" disabled={updating} onClick={() => setCancelOpen(true)}><X /> Cancelar pedido</Button>}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Clock3 className="size-4" />Este pedido está em um status final.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={scheduleOpen} onOpenChange={(open) => { if (!updating) setScheduleOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Agendar instalação</DialogTitle><DialogDescription>Defina o responsável e a data antes de avançar o pedido.</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div><Label htmlFor="technician">Técnico</Label><Select value={technicianId} onValueChange={(value) => { setTechnicianId(value); setScheduleError(""); }}><SelectTrigger id="technician" className="mt-2 w-full"><SelectValue placeholder="Selecione um técnico" /></SelectTrigger><SelectContent>{technicians.map((technician) => <SelectItem key={technician.id} value={technician.id}><span className="font-medium">{technician.nome}</span>{technician.especialidade ? ` — ${technician.especialidade}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="installation-datetime">Data e hora da instalação</Label><Input id="installation-datetime" type="datetime-local" className="mt-2 w-full" value={installationDate} onChange={(event) => { setInstallationDate(event.target.value); setScheduleError(""); }} /></div>
            {scheduleError && <Alert variant="destructive"><CircleAlert className="size-4" /><AlertDescription>{scheduleError}</AlertDescription></Alert>}
          </div>
          <DialogFooter><Button variant="outline" disabled={updating} onClick={() => setScheduleOpen(false)}>Voltar</Button><Button disabled={updating || !scheduleReady} onClick={handleSchedule}>{updating ? <LoaderCircle className="animate-spin" /> : <CalendarDays />} Confirmar agendamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen && Boolean(selectedOrder && canCancelOrder(selectedOrder.status))} onOpenChange={(open) => { if (!updating) setCancelOpen(open); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar este pedido?</AlertDialogTitle><AlertDialogDescription>Esta ação encerra o fluxo e o pedido não poderá voltar a um status anterior.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={updating}>Manter pedido</AlertDialogCancel><AlertDialogAction disabled={updating} onClick={(event) => { event.preventDefault(); void changeStatus("cancelado"); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{updating && <LoaderCircle className="animate-spin" />} Confirmar cancelamento</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
