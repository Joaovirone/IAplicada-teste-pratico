import { z } from "zod";
import { catalogClient } from "@/lib/product-catalog";
import { phoneSchema } from "@/lib/phone";
import type { Technician } from "@/lib/orders";

export const technicianSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do técnico.").max(120),
  telefone: phoneSchema,
  especialidade: z.string().trim().min(2, "Informe a especialidade.").max(120),
});
export type TechnicianInput = z.infer<typeof technicianSchema>;
const columns = "id,nome,telefone,especialidade";

export async function fetchTechnicians(signal: AbortSignal): Promise<Technician[]> {
  const technicians: Technician[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await catalogClient
      .from("tecnicos")
      .select(columns)
      .order("nome")
      .order("id")
      .range(offset, offset + 499)
      .abortSignal(signal);
    if (error) throw error;
    const page = (data ?? []) as Technician[];
    technicians.push(...page);
    if (page.length < 500) return technicians;
  }
}

export async function saveTechnician({
  id,
  input,
}: {
  id?: string;
  input: TechnicianInput;
}): Promise<Technician> {
  const values = technicianSchema.parse(input);
  const query = id
    ? catalogClient.from("tecnicos").update(values).eq("id", id)
    : catalogClient.from("tecnicos").insert(values);
  const { data, error } = await query.select(columns).single();
  if (error) throw error;
  if (!data) throw new Error("Não foi possível salvar os dados do técnico.");
  return data as Technician;
}

export async function deleteTechnician(id: string): Promise<void> {
  const { data, error } = await catalogClient
    .from("tecnicos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Técnico não encontrado ou exclusão não autorizada.");
}
