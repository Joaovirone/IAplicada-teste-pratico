import { describe, expect, it } from "vitest";

import { calculateCartTotal } from "@/lib/cart-total";
import { canAdvanceOrderStatus, canCancelOrder, nextOrderStatus } from "@/lib/order-status";
import { schedulingSchema, type OrderStatus } from "@/lib/orders";

describe("valor do carrinho", () => {
  it("soma quantidade × preço em tempo real", () => {
    expect(calculateCartTotal([
      { quantidade: 2, preco_unitario: 450 },
      { quantidade: 1, preco_unitario: 180 },
    ])).toBe(1080);
  });

  it("soma centavos sem erro de ponto flutuante", () => {
    expect(calculateCartTotal([
      { quantidade: 3, preco_unitario: 0.1 },
      { quantidade: 1, preco_unitario: 0.2 },
    ])).toBe(0.5);
  });
});

describe("transições do pedido", () => {
  it("só permite cancelamento em orçamento ou aprovado", () => {
    const statuses: OrderStatus[] = ["orcamento", "aprovado", "agendado", "em_andamento", "concluido", "cancelado"];
    expect(statuses.filter(canCancelOrder)).toEqual(["orcamento", "aprovado"]);
  });

  it("só permite o próximo status do fluxo", () => {
    expect(nextOrderStatus).toEqual({ orcamento: "aprovado", aprovado: "agendado", agendado: "em_andamento", em_andamento: "concluido" });
    expect(canAdvanceOrderStatus("aprovado", "agendado")).toBe(true);
    expect(canAdvanceOrderStatus("aprovado", "concluido")).toBe(false);
    expect(canAdvanceOrderStatus("cancelado", "aprovado")).toBe(false);
  });

  it("exige técnico e data/hora futura para agendar", () => {
    const future = new Date(Date.now() + 60_000);
    const tecnico_id = "11111111-1111-4111-8111-111111111111";
    expect(schedulingSchema.safeParse({ tecnico_id, data_instalacao: future }).success).toBe(true);
    expect(schedulingSchema.safeParse({ tecnico_id: "", data_instalacao: future }).success).toBe(false);
    expect(schedulingSchema.safeParse({ tecnico_id, data_instalacao: undefined }).success).toBe(false);
    expect(schedulingSchema.safeParse({ tecnico_id, data_instalacao: new Date(Date.now() - 60_000) }).success).toBe(false);
  });
});
