import { z } from "zod";
import { customerSchema, ordersClient, type Customer, type OrderStatus } from "@/lib/orders";
import { phoneSchema } from "@/lib/phone";

export type CustomerRecord = Customer & { created_at: string };
export type CustomerOrder = {
  id: string;
  cliente_id: string;
  status: OrderStatus;
  valor_total: number;
  created_at: string;
};

export const newCustomerSchema = customerSchema.extend({
  telefone: phoneSchema,
  email: z.string().trim().max(255).email("Informe um e-mail válido.").or(z.literal("")),
});
export type NewCustomer = z.infer<typeof newCustomerSchema>;

const customerColumns = "id,nome,telefone,email,endereco,created_at";
const pageSize = 500;

// Busca em páginas para não truncar os registros no limite padrão da API.
export async function fetchCustomers(signal: AbortSignal): Promise<CustomerRecord[]> {
  const customers: CustomerRecord[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await ordersClient
      .from("clientes")
      .select(customerColumns)
      .order("nome")
      .order("id")
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);
    if (error) throw error;
    const page = (data ?? []) as CustomerRecord[];
    customers.push(...page);
    if (page.length < pageSize) return customers;
  }
}

export async function createCustomer(input: NewCustomer): Promise<CustomerRecord> {
  const values = newCustomerSchema.parse(input);
  const { data, error } = await ordersClient
    .from("clientes")
    .insert({ ...values, email: values.email || null })
    .select(customerColumns)
    .single();
  if (error) throw error;
  if (!data) throw new Error("O cadastro não retornou os dados do cliente.");
  return data as CustomerRecord;
}

export async function updateCustomer(id: string, input: NewCustomer): Promise<CustomerRecord> {
  const values = newCustomerSchema.parse(input);
  const { data, error } = await ordersClient
    .from("clientes")
    .update({ ...values, email: values.email || null })
    .eq("id", id)
    .select(customerColumns)
    .single();
  if (error) throw error;
  if (!data) throw new Error("Cliente não encontrado ou edição não autorizada.");
  return data as CustomerRecord;
}

export async function fetchCustomerOrders(
  customerId: string,
  signal: AbortSignal,
): Promise<CustomerOrder[]> {
  const orders: CustomerOrder[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await ordersClient
      .from("pedidos")
      .select("id,cliente_id,status,valor_total,created_at")
      .eq("cliente_id", customerId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);
    if (error) throw error;
    const page = (data ?? []) as CustomerOrder[];
    orders.push(...page);
    if (page.length < pageSize) return orders;
  }
}

export function matchesCustomer(customer: Customer, search: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const term = search.trim();
  const digits = term.replace(/\D/g, "");
  return (
    normalize(customer.nome).includes(normalize(term)) ||
    (!!digits && (customer.telefone ?? "").replace(/\D/g, "").includes(digits))
  );
}
