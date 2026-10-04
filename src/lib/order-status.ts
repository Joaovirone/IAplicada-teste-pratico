import type { OrderStatus } from "@/lib/orders";

export const orderStatusLabels: Record<OrderStatus, string> = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const nextOrderStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  orcamento: "aprovado",
  aprovado: "agendado",
  agendado: "em_andamento",
  em_andamento: "concluido",
};

export function canAdvanceOrderStatus(current: OrderStatus, target: OrderStatus) {
  return nextOrderStatus[current] === target;
}

export function canCancelOrder(current: OrderStatus) {
  return current === "orcamento" || current === "aprovado";
}
