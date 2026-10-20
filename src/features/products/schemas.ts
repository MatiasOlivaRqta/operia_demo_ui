import { z } from "zod";
import type { Product } from "@/features/products/types";

export const productSchema = z.object({
  barcode: z.string().trim(),
  categoryId: z.string().trim().min(1, "validation.product.categoryRequired"),
  costPesos: z.coerce.number().min(0, "validation.product.costNonNegative"),
  minimumStock: z.coerce.number().int().min(0, "validation.product.minimumStockNonNegative"),
  name: z.string().trim().min(1, "validation.product.nameRequired"),
  pricePesos: z.coerce.number().positive("validation.product.pricePositive"),
  sku: z.string().trim().min(1, "validation.product.skuRequired"),
  status: z.enum(["active", "inactive"]),
  unit: z.string().trim().min(1, "validation.product.unitRequired"),
});

export const stockMovementSchema = z.object({
  action: z.enum(["Ingreso", "Salida"]),
  note: z.string().trim().min(1, "validation.product.reasonRequired"),
  quantity: z.coerce.number().int().positive("validation.product.quantityPositiveInteger"),
});

export const stockAdjustmentSchema = z.object({
  note: z.string().trim().min(1, "validation.product.reasonRequired"),
  targetStock: z.coerce.number().int().min(0, "validation.product.targetStockNonNegative"),
});

export const stockReversalSchema = z.object({
  movementId: z.string().min(1, "validation.product.movementRequired"),
  reason: z.string().trim().min(1, "validation.product.reasonRequired"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;
export type StockMovementValues = z.infer<typeof stockMovementSchema>;
export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
export type StockReversalValues = z.infer<typeof stockReversalSchema>;

export function productToFormValues(
  product: Pick<
    Product,
    | "barcode"
    | "categoryId"
    | "costCents"
    | "minimumStock"
    | "name"
    | "priceCents"
    | "sku"
    | "status"
    | "unit"
  >,
): ProductFormInput {
  return {
    barcode: product.barcode,
    categoryId: product.categoryId,
    costPesos: product.costCents / 100,
    minimumStock: product.minimumStock,
    name: product.name,
    pricePesos: product.priceCents / 100,
    sku: product.sku,
    status: product.status,
    unit: product.unit,
  };
}
