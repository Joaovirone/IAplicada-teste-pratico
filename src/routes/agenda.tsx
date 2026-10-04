import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, CircleAlert, Clock3, LoaderCircle, MapPin, RefreshCw, UserRound, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { canAdvanceOrderStatus, nextOrderStatus, orderStatusLabels } from "@/lib/order-status";
import { ordersClient, type OrderStatus, type Technician } from "@/lib/orders";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [
    { title: "Agenda dos Técnicos — SmartLar Hub" },
    { name: "description", content: "Acompanhe instalações agendadas e atendimentos em andamento por técnico." },
    { property: "og:title", content: "Agenda dos Técnicos — SmartLar Hub" },
    { property: "og:description", content: "Acompanhe instalações agendadas e atendimentos em andamento por técnico." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TechnicianAgenda,
});

type AgendaOrder = {
  id: string;
  status: "agendado" | "em_andamento";
  data_instalacao: string | null;
  clientes: { nome: string; endereco: string | null } | null;
};

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function TechnicianAgenda() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState("");
  const [orders, setOrders] = useState<AgendaOrder[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selectedTechnician = useMemo(
    () => technicians.find((technician) => technician.id === technicianId) ?? null,
    [technicianId, technicians],
  );

  async function loadTechnicians() {
    setLoadingTechnicians(true);
    setLoadError("");
    const { data, error } = await ordersClient.from("tecnicos").select("id,nome,telefone,especialidade").order("nome");
    if (error) setLoadError("Não foi possível carregar os técnicos. Tente novamente.");
    else setTechnicians((data ?? []) as Technician[]);
    setLoadingTechnicians(false);
  }

  async function loadAgenda(id: string) {
    setLoadingOrders(true);
    setLoadError("");
    const { data, error } = await ordersClient
      .from("pedidos")
      .select("id,status,data_instalacao,clientes(nome,endereco)")
      .eq("tecnico_id", id)
      .in("status", ["agendado", "em_andamento"])
      .order("data_instalacao", { ascending: true, nullsFirst: false });
    if (error) setLoadError("Não foi possível carregar a agenda deste técnico.");
    else setOrders((data ?? []) as unknown as AgendaOrder[]);
    setLoadingOrders(false);
  }

  useEffect(() => { void loadTechnicians(); }, []);

  async function advanceOrder(order: AgendaOrder) {
    if (updatingId) return;
    const target = nextOrderStatus[order.status];
    if (!target || (target !== "em_andamento" && target !== "concluido")) return;
    setUpdatingId(order.id);
    const { data: persisted, error: checkError } = await ordersClient
      .from("pedidos")
      .select("status,tecnico_id")
      .eq("id", order.id)
      .single();
    const current = persisted?.status as OrderStatus | undefined;
    if (checkError || !current || persisted?.tecnico_id !== technicianId || !canAdvanceOrderStatus(current, target)) {
      setUpdatingId(null);
      toast.error("O pedido foi alterado em outro acesso. A agenda será atualizada.");
      await loadAgenda(technicianId);
      return;
    }
    const { data, error } = await ordersClient
      .from("pedidos")
      .update({ status: target })
      .eq("id", order.id)
      .eq("status", current)
      .eq("tecnico_id", technicianId)
      .select("id")
      .maybeSingle();
    setUpdatingId(null);
    if (error || !data) {
      toast.error("Não foi possível atualizar o atendimento.");
      await loadAgenda(technicianId);
      return;
    }
    setOrders((currentOrders) => target === "concluido"
      ? currentOrders.filter((item) => item.id !== order.id)
      : currentOrders.map((item) => item.id === order.id ? { ...item, status: "em_andamento" } : item));
    toast.success(target === "concluido" ? "Atendimento concluído." : "Atendimento iniciado.");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-primary">Operação em campo</p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Agenda dos Técnicos</h1>
          <p className="mt-3 text-sm text-muted-foreground">Instalações agendadas e atendimentos em execução.</p>
        </div>
        <div className="w-full lg:w-80">
          <Select value={technicianId} disabled={loadingTechnicians} onValueChange={(value) => { setTechnicianId(value); void loadAgenda(value); }}>
            <SelectTrigger className="h-11 w-full bg-card" aria-label="Selecionar técnico"><SelectValue placeholder={loadingTechnicians ? "Carregando técnicos..." : "Selecione um técnico"} /></SelectTrigger>
            <SelectContent>{technicians.map((technician) => <SelectItem key={technician.id} value={technician.id}>{technician.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive" className="mt-6"><CircleAlert className="size-4" /><AlertDescription className="flex flex-wrap items-center justify-between gap-3">{loadError}<Button variant="outline" size="sm" onClick={() => technicianId ? void loadAgenda(technicianId) : void loadTechnicians()}><RefreshCw /> Tentar novamente</Button></AlertDescription></Alert>
      ) : !technicianId ? (
        <div className="mt-6 flex min-h-80 flex-col items-center justify-center border border-dashed border-border text-center">
          <Wrench className="size-9 text-primary" />
          <h2 className="mt-4 text-lg font-bold text-foreground">Escolha um técnico</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">A agenda individual aparecerá aqui.</p>
        </div>
      ) : loadingOrders ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-48 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <div className="mt-6 flex min-h-80 flex-col items-center justify-center border border-dashed border-border text-center">
          <Check className="size-9 text-primary" />
          <h2 className="mt-4 text-lg font-bold text-foreground">Agenda em dia</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{selectedTechnician?.nome} não tem instalações agendadas ou em andamento.</p>
        </div>
      ) : (
        <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label={`Agenda de ${selectedTechnician?.nome ?? "técnico"}`}>
          {orders.map((order) => {
            const isUpdating = updatingId === order.id;
            return (
              <article key={order.id} className="border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-extrabold text-muted-foreground">{shortId(order.id)}</p><h2 className="mt-1 text-lg font-extrabold text-card-foreground">{order.clientes?.nome ?? "Cliente não encontrado"}</h2></div>
                  <Badge variant={order.status === "em_andamento" ? "default" : "secondary"}>{orderStatusLabels[order.status]}</Badge>
                </div>
                <div className="mt-5 space-y-3 border-y border-border py-4 text-sm">
                  <p className="flex items-start gap-3 font-bold text-foreground"><CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />{order.data_instalacao ? format(new Date(order.data_instalacao), "EEEE, dd 'de' MMMM", { locale: ptBR }) : "Data não definida"}</p>
                  <p className="flex items-start gap-3 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{order.clientes?.endereco ?? "Endereço não informado"}</p>
                  <p className="flex items-center gap-3 text-muted-foreground"><UserRound className="size-4 shrink-0" />{selectedTechnician?.nome}</p>
                </div>
                <Button className="mt-5 w-full" disabled={Boolean(updatingId)} onClick={() => void advanceOrder(order)}>
                  {isUpdating ? <LoaderCircle className="animate-spin" /> : order.status === "agendado" ? <Clock3 /> : <Check />}
                  {order.status === "agendado" ? "Iniciar atendimento" : "Concluir atendimento"}
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}