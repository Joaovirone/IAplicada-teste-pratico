import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Banknote, CalendarCheck, CircleAlert, ClipboardClock, FileText, MapPin, ReceiptText, RefreshCw, UserRound, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ordersClient, type OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard do Rafael — SmartLar Hub" },
    { name: "description", content: "Indicadores comerciais, próximas instalações e orçamentos da SmartLar Hub." },
    { property: "og:title", content: "Dashboard do Rafael — SmartLar Hub" },
    { property: "og:description", content: "Indicadores comerciais, próximas instalações e orçamentos da SmartLar Hub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

type DashboardOrder = {
  id: string;
  status: OrderStatus;
  valor_total: number;
  data_instalacao: string | null;
  created_at: string;
  clientes: { nome: string; endereco: string | null } | null;
  tecnicos: { nome: string } | null;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <article className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4"><p className="max-w-44 text-xs font-extrabold uppercase leading-5 text-muted-foreground">{label}</p><span className="flex size-9 shrink-0 items-center justify-center bg-secondary text-primary">{icon}</span></div>
      <p className="mt-5 text-2xl font-extrabold text-card-foreground sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function Dashboard() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setLoadError("");
    const { data, error } = await ordersClient
      .from("pedidos")
      .select("id,status,valor_total,data_instalacao,created_at,clientes(nome,endereco),tecnicos(nome)")
      .order("created_at", { ascending: false });
    if (error) setLoadError("Não foi possível carregar os indicadores. Tente novamente.");
    else setOrders((data ?? []) as unknown as DashboardOrder[]);
    setLoading(false);
  }

  useEffect(() => { void loadDashboard(); }, []);

  const dashboard = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
    const monthOrders = orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= monthStart && created < nextMonthStart;
    });
    const billed = orders.filter((order) => order.status === "concluido").reduce((sum, order) => sum + Number(order.valor_total), 0);
    const receivable = orders.filter((order) => ["aprovado", "agendado", "em_andamento"].includes(order.status)).reduce((sum, order) => sum + Number(order.valor_total), 0);
    const pendingScheduling = orders.filter((order) => order.status === "aprovado").length;
    const upcoming = orders.filter((order) => {
      if (order.status !== "agendado" || !order.data_instalacao) return false;
      const installation = new Date(order.data_instalacao);
      return installation >= todayStart && installation <= sevenDaysEnd;
    }).sort((a, b) => new Date(a.data_instalacao ?? 0).getTime() - new Date(b.data_instalacao ?? 0).getTime());
    const quotes = orders.filter((order) => order.status === "orcamento");
    return { monthOrders: monthOrders.length, billed, receivable, pendingScheduling, upcoming, quotes };
  }, [orders]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-border pb-7">
        <p className="mb-2 text-xs font-bold uppercase text-primary">Visão geral</p>
        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Dashboard do Rafael</h1>
        <p className="mt-3 text-sm text-muted-foreground">Resumo comercial e prioridades da operação.</p>
      </header>

      {loadError ? (
        <Alert variant="destructive" className="mt-6"><CircleAlert className="size-4" /><AlertDescription className="flex flex-wrap items-center justify-between gap-3">{loadError}<Button variant="outline" size="sm" onClick={() => void loadDashboard()}><RefreshCw /> Tentar novamente</Button></AlertDescription></Alert>
      ) : loading ? (
        <div className="mt-6 space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40 w-full" />)}</div><Skeleton className="h-72 w-full" /></div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
            <MetricCard label="Pedidos do mês" value={String(dashboard.monthOrders)} detail={format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} icon={<ReceiptText className="size-5" />} />
            <MetricCard label="Valor total faturado" value={money.format(dashboard.billed)} detail="Pedidos concluídos" icon={<Banknote className="size-5" />} />
            <MetricCard label="Valor a receber" value={money.format(dashboard.receivable)} detail="Aprovados e em operação" icon={<ClipboardClock className="size-5" />} />
            <MetricCard label="Pendentes de agendamento" value={String(dashboard.pendingScheduling)} detail="Pedidos aprovados" icon={<CalendarCheck className="size-5" />} />
          </section>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.45fr_1fr]">
            <section aria-labelledby="upcoming-title">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Próximos 7 dias</p><h2 id="upcoming-title" className="mt-1 text-xl font-extrabold text-foreground">Instalações agendadas</h2></div><Link to="/agenda" className="text-sm font-bold text-primary hover:underline">Ver agenda</Link></div>
              {dashboard.upcoming.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-border text-center"><CalendarCheck className="size-8 text-muted-foreground" /><p className="mt-3 font-bold text-foreground">Nenhuma instalação próxima</p><p className="mt-1 text-sm text-muted-foreground">Não há instalações agendadas para esta janela.</p></div>
              ) : (
                <div className="overflow-hidden border border-border bg-card">
                  <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente e endereço</TableHead><TableHead>Técnico</TableHead></TableRow></TableHeader><TableBody>{dashboard.upcoming.map((order) => <TableRow key={order.id}><TableCell className="whitespace-nowrap font-bold">{format(new Date(order.data_instalacao ?? 0), "dd/MM/yyyy")}</TableCell><TableCell><p className="font-bold text-foreground">{order.clientes?.nome ?? "Cliente não encontrado"}</p><p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{order.clientes?.endereco ?? "Endereço não informado"}</p></TableCell><TableCell>{order.tecnicos?.nome ?? "Não definido"}</TableCell></TableRow>)}</TableBody></Table></div>
                  <div className="divide-y divide-border md:hidden">{dashboard.upcoming.map((order) => <article key={order.id} className="p-4"><div className="flex justify-between gap-3"><p className="font-bold text-foreground">{order.clientes?.nome ?? "Cliente não encontrado"}</p><Badge variant="secondary">{format(new Date(order.data_instalacao ?? 0), "dd/MM")}</Badge></div><p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{order.clientes?.endereco ?? "Endereço não informado"}</p><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Wrench className="size-4" />{order.tecnicos?.nome ?? "Técnico não definido"}</p></article>)}</div>
                </div>
              )}
            </section>

            <section aria-labelledby="quotes-title">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Ação comercial</p><h2 id="quotes-title" className="mt-1 text-xl font-extrabold text-foreground">Aguardando aprovação</h2></div><Badge variant="secondary">{dashboard.quotes.length}</Badge></div>
              {dashboard.quotes.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-border text-center"><FileText className="size-8 text-muted-foreground" /><p className="mt-3 font-bold text-foreground">Nenhum orçamento pendente</p></div>
              ) : (
                <div className="divide-y divide-border border border-border bg-card">{dashboard.quotes.map((order) => <article key={order.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="flex items-center gap-2 truncate font-bold text-foreground"><UserRound className="size-4 shrink-0 text-primary" />{order.clientes?.nome ?? "Cliente não encontrado"}</p><p className="mt-1 text-xs text-muted-foreground">Criado em {format(new Date(order.created_at), "dd/MM/yyyy")}</p></div><div className="shrink-0 text-right"><p className="font-extrabold text-foreground">{money.format(Number(order.valor_total))}</p><Button asChild variant="ghost" size="sm" className="mt-1"><Link to="/pedidos">Ver pedido <ArrowRight /></Link></Button></div></article>)}</div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}