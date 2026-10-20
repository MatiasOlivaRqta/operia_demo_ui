import { describe, expect, it } from "vitest";
import { products } from "@/features/products/mock-data";
import { calculateAvailableStock, getInventoryValue, isLowStock } from "@/features/products/domain";
import { toCents } from "@/lib/money";

describe("product inventory calculations", () => {
  it("calculates available stock from movements and flags low stock", () => {
    const product = products[0]!;
    expect(calculateAvailableStock(product.movements)).toBe(10);
    expect(isLowStock(product)).toBe(false);
    expect(isLowStock({ ...product, minimumStock: 10 })).toBe(true);
  });

  it("calculates inventory value using cost in cents", () => {
    expect(getInventoryValue(products)).toBe(
      toCents(
        products.reduce(
          (total, product) =>
            total + calculateAvailableStock(product.movements) * product.costCents,
          0,
        ) / 100,
      ),
    );
  });
});
