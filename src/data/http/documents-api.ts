import type { ListQuery, Page } from "@/data/api";
import { requestApi } from "@/data/http/client";
import type { DocumentWithTotal, DocumentSummary } from "@/features/documents/types";
import type { DocumentFormValues } from "@/features/documents/schemas";
import { documentCollectionsDtoSchema } from "@/features/cash/dto";
import type { DocumentCollections } from "@/features/cash/types";
import { failure } from "@/lib/result";
import { asCents } from "@/lib/money";

export function documentQueryString(query?: ListQuery): string {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.status && query.status !== "all") params.set("status", query.status);
  if (query?.customerId) params.set("customerId", query.customerId);
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const documentsApi = {
  list: (query?: ListQuery, control?: { signal?: AbortSignal }) =>
    requestApi<Page<DocumentSummary>>(`/documents${documentQueryString(query)}`, control),
  get: (id: string, control?: { signal?: AbortSignal }) =>
    requestApi<DocumentWithTotal>(`/documents/${encodeURIComponent(id)}`, control),
  async collections(id: string, control?: { signal?: AbortSignal }) {
    const result = await requestApi<unknown>(
      `/documents/${encodeURIComponent(id)}/collections`,
      control,
    );
    if (!result.ok) return result;
    const parsed = documentCollectionsDtoSchema.safeParse(result.value);
    return parsed.success
      ? {
          ok: true as const,
          value: {
            ...parsed.data,
            items: parsed.data.items.map((item) => ({
              ...item,
              amountCents: asCents(item.amountCents),
            })),
            totalCents: asCents(parsed.data.totalCents),
            paidCents: asCents(parsed.data.paidCents),
            pendingCents: asCents(parsed.data.pendingCents),
          } satisfies DocumentCollections,
        }
      : failure(
          "unexpected",
          "El servicio devolvió una respuesta inválida.",
          undefined,
          "errors.invalidResponse",
        );
  },
  create: (input: DocumentFormValues, idempotencyKey: string) =>
    requestApi<DocumentWithTotal>("/documents", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        customerId: input.customerId,
        items: input.items.map(
          ({ discountRate, productId, quantity, taxRate, unitPriceCents }) => ({
            discountRate,
            productId,
            quantity,
            taxRate,
            unitPriceCents,
          }),
        ),
      },
    }),
  cancel: (id: string, reason: string) =>
    requestApi<DocumentWithTotal>(`/documents/${encodeURIComponent(id)}/cancellation`, {
      method: "POST",
      body: { reason },
    }),
};
