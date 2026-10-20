import { describe, expect, it } from "vitest";
import { products } from "@/features/products/mock-data";
import { productToFormValues } from "@/features/products/schemas";
import { productSchema } from "@/features/products/schemas";

describe("productToFormValues", () => {
  it("maps product fields and converts prices from cents to pesos", () => {
    const product = products[0]!;

    expect(productToFormValues(product)).toEqual({
      barcode: product.barcode,
      categoryId: product.categoryId,
      costPesos: product.costCents / 100,
      minimumStock: product.minimumStock,
      name: product.name,
      pricePesos: product.priceCents / 100,
      sku: product.sku,
      status: product.status,
      unit: product.unit,
    });
  });
});

describe("product form schema messages", () => {
  it("returns translation keys for required fields and numeric boundaries", () => {
    const parsed = productSchema.safeParse({
      barcode: "",
      categoryId: "",
      costPesos: -1,
      minimumStock: -1,
      name: "",
      pricePesos: 0,
      sku: "",
      status: "active",
      unit: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages).toContain("validation.product.categoryRequired");
      expect(messages).toContain("validation.product.costNonNegative");
      expect(messages).toContain("validation.product.nameRequired");
    }
  });
});
