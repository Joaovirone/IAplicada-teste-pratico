import { z } from "zod";

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const number = digits.slice(2);
  return `(${digits.slice(0, 2)}) ${number.slice(0, 5)}${number.length > 5 ? `-${number.slice(5)}` : ""}`;
}

export const phoneSchema = z
  .string()
  .regex(/^\([1-9]{2}\) 9\d{4}-\d{4}$/, "Informe um celular com DDD no formato (XX) XXXXX-XXXX.")
  .refine(
    (value) => !/^(\d)\1{7}$/.test(value.replace(/\D/g, "").slice(-8)),
    "Informe um telefone válido, sem sequência de dígitos repetidos.",
  );
