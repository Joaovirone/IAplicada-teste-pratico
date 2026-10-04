import { z } from "zod";

import { catalogClient } from "@/lib/product-catalog";

export { catalogClient as ordersClient };

export type Customer = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
};

export type OrderStatus = "orcamento" | "aprovado" | "agendado" | "em_andamento" | "concluido" | "cancelado";

export type Technician = {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
};

export type OrderItem = {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produtos: {
    id: string;
    nome: string;
    categoria: string;
  } | null;
};

export type Order = {
  id: string;
  status: OrderStatus;
  valor_total: number;
  forma_pagamento: string | null;
  observacoes: string | null;
  data_instalacao: string | null;
  created_at: string;
  updated_at: string;
  clientes: Customer | null;
  tecnicos: Technician | null;
  itens_pedido: OrderItem[];
};

export const customerSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(120, "O nome é muito longo."),
  telefone: z.string().trim().min(8, "Informe um telefone válido.").max(30, "O telefone é muito longo."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "O e-mail é muito longo."),
  endereco: z.string().trim().min(5, "Informe o endereço.").max(300, "O endereço é muito longo."),
});

export const orderSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente."),
  observacoes: z.string().trim().max(1000, "As observações devem ter até 1.000 caracteres."),
  itens: z.array(z.object({
    produto_id: z.string().uuid("Selecione um produto."),
    quantidade: z.coerce.number().int("Use uma quantidade inteira.").min(1, "A quantidade mínima é 1.").max(999, "A quantidade máxima é 999."),
    preco_unitario: z.number().finite().positive(),
  })).min(1, "Adicione pelo menos um produto."),
});

export const schedulingSchema = z.object({
  tecnico_id: z.string().uuid("Selecione um técnico."),
  data_instalacao: z.date({ required_error: "Selecione a data de instalação." }),
});
