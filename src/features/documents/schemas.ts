import { z } from "zod";

export const documentLineSchema = z.object({
  discountRate: z.coerce.number().min(0).max(100),
  productId: z.string().min(1, "validation.document.productRequired"),
  quantity: z.coerce.number().positive("validation.document.quantityPositive"),
  taxRate: z.coerce.number().min(0).max(100),
  unitPriceCents: z.coerce.number().int().min(0),
});

export const documentSchema = z.object({
  customerId: z.string().min(1, "validation.document.customerRequired"),
  items: z.array(documentLineSchema).min(1, "validation.document.itemRequired"),
});

export type DocumentFormValues = z.infer<typeof documentSchema>;
