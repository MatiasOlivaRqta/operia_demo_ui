import { z } from "zod";
import { asCents, parsePesosToCents } from "@/lib/money";

function pesoAmount(requiredKey: string, invalidKey: string, minimumCents = 0) {
  return z
    .string()
    .trim()
    .min(1, requiredKey)
    .transform((text, context) => {
      const cents = parsePesosToCents(text);
      if (cents === null) {
        context.addIssue({ code: "custom", message: invalidKey });
        return asCents(0);
      }
      if (cents < minimumCents) {
        context.addIssue({
          code: "custom",
          message: minimumCents === 0 ? "validation.nonNegative" : "validation.money.positive",
        });
        return asCents(0);
      }
      return cents;
    });
}

export const cashOpenSchema = z.object({
  openingBalanceCents: pesoAmount("validation.cash.openingRequired", "validation.money.invalid"),
});

export const cashCloseSchema = z.object({
  declaredBalanceCents: pesoAmount("validation.cash.declaredRequired", "validation.money.invalid"),
  observation: z.string().trim().max(500, "validation.maxLength|500").optional().default(""),
});

export const collectPaymentSchema = z.object({
  amountCents: pesoAmount("validation.cash.amountRequired", "validation.money.invalid", 1),
  customerId: z.string().min(1, "validation.cash.customerRequired"),
  documentId: z.string().optional(),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
});

export type CashOpenValues = z.infer<typeof cashOpenSchema>;
export type CashCloseValues = z.infer<typeof cashCloseSchema>;
export type CollectPaymentValues = z.infer<typeof collectPaymentSchema>;
