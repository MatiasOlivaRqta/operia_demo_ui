import type { InventoryMovementQuery } from "@/data/api";
import type { StockMovementType } from "@/features/products/types";

export type InventoryMovementFilters = Readonly<{
  type: StockMovementType | "";
  productId: string;
  from: string;
  to: string;
}>;

export function activeInventoryMovementFilterCount(filters: InventoryMovementFilters): number {
  return (
    Number(Boolean(filters.type)) +
    Number(Boolean(filters.productId)) +
    Number(Boolean(filters.from)) +
    Number(Boolean(filters.to))
  );
}

export function isInventoryMovementDateRangeValid(from: string, to: string): boolean {
  return !from || !to || from <= to;
}

export function buildInventoryMovementQuery(
  filters: InventoryMovementFilters,
  page: number,
  pageSize: number,
): InventoryMovementQuery | null {
  if (!isInventoryMovementDateRangeValid(filters.from, filters.to)) return null;
  return {
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    page,
    pageSize,
  };
}
