import type { Product, StockMovement } from "@/features/products/types";
import { asCents, type Cents } from "@/lib/money";

export function calculateAvailableStock(movements: readonly StockMovement[]): number {
  return movements.reduce((stock, movement) => stock + movement.quantity, 0);
}

export function isLowStock(product: Product): boolean {
  return calculateAvailableStock(product.movements) <= product.minimumStock;
}

export function getInventoryValue(products: readonly Product[]): Cents {
  return asCents(
    products.reduce(
      (total, product) => total + calculateAvailableStock(product.movements) * product.costCents,
      0,
    ),
  );
}
