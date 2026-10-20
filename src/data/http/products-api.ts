import type { CursorPage, ListQuery, Page, ProductMovementQuery } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { ProductSummary, StockMovementEntry } from "@/features/products/types";
import type { ProductFormValues } from "@/features/products/schemas";
import type { StockAdjustmentValues, StockMovementValues } from "@/features/products/schemas";
import { toCents } from "@/lib/money";

export function productQueryString(query?: ListQuery): string {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.status && query.status !== "all") params.set("status", query.status);
  if (query?.lowStock) params.set("lowStock", "true");
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function movementQueryString(query?: ProductMovementQuery): string {
  const params = new URLSearchParams();
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.cursor !== undefined) params.set("cursor", query.cursor);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function productInput(input: ProductFormValues) {
  const { costPesos, pricePesos, ...fields } = input;
  return {
    ...fields,
    costCents: toCents(costPesos),
    priceCents: toCents(pricePesos),
  };
}

export const productsApi = {
  list: (query?: ListQuery, control?: { signal?: AbortSignal }) =>
    requestApi<Page<ProductSummary>>(`/products${productQueryString(query)}`, control),
  get: (id: string, control?: { signal?: AbortSignal }) =>
    requestApi<ProductSummary>(`/products/${encodeURIComponent(id)}`, control),
  movements: (id: string, query?: ProductMovementQuery, control?: { signal?: AbortSignal }) =>
    requestApi<CursorPage<StockMovementEntry>>(
      `/products/${encodeURIComponent(id)}/movements${movementQueryString(query)}`,
      control,
    ),
  create: (input: ProductFormValues) =>
    requestApi<ProductSummary>("/products", { method: "POST", body: productInput(input) }),
  update: (id: string, input: ProductFormValues) =>
    requestApi<ProductSummary>(`/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: productInput(input),
    }),
  addStockMovement: (id: string, input: StockMovementValues) =>
    requestApi<StockMovementEntry>(`/products/${encodeURIComponent(id)}/stock-movements`, {
      method: "POST",
      body: { action: input.action, quantity: input.quantity, note: input.note },
    }),
  adjustStock: (id: string, input: StockAdjustmentValues) =>
    requestApi<StockMovementEntry>(`/products/${encodeURIComponent(id)}/stock-adjustments`, {
      method: "POST",
      body: input,
    }),
  reverseStockMovement: (id: string, movementId: string, reason: string) =>
    requestApi<StockMovementEntry>(
      `/products/${encodeURIComponent(id)}/stock-movements/${encodeURIComponent(movementId)}/reversal`,
      { method: "POST", body: { reason } },
    ),
};
