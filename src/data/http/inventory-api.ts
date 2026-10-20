import type { InventoryMovementQuery, Page } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { InventorySummary, StockMovementEntry } from "@/features/products/types";

export function inventoryQueryString(query?: InventoryMovementQuery): string {
  const params = new URLSearchParams();
  if (query?.type) params.set("type", query.type);
  if (query?.productId) params.set("productId", query.productId);
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const inventoryApi = {
  summary: (control?: { signal?: AbortSignal }) =>
    requestApi<InventorySummary>("/inventory/summary", control),
  movements: (query?: InventoryMovementQuery, control?: { signal?: AbortSignal }) =>
    requestApi<Page<StockMovementEntry>>(`/stock-movements${inventoryQueryString(query)}`, control),
};
