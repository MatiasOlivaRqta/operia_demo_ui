import type { CustomerAccountApi, RequestControl } from "@/data/api";
import { requestApi } from "@/data/http/client";
import {
  customerAccountDtoSchema,
  collectionApplicationsDtoSchema,
  customerAccountMovementPageDtoSchema,
  customerAccountSummaryDtoSchema,
} from "@/features/cash/dto";
import { mapCustomerAccount } from "@/features/cash/mappers";
import { failure } from "@/lib/result";
import { asCents } from "@/lib/money";

export const customerAccountApi: CustomerAccountApi = {
  async get(customerId: string, control?: RequestControl) {
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    const result = await requestApi<unknown>(
      `/customers/${encodeURIComponent(customerId)}/account?${query.toString()}`,
      control,
    );
    if (!result.ok) return result;
    const parsed = customerAccountDtoSchema.safeParse(result.value);
    return parsed.success
      ? { ok: true, value: mapCustomerAccount(parsed.data) }
      : failure(
          "unexpected",
          "El servicio devolvió una respuesta inválida.",
          undefined,
          "errors.invalidResponse",
        );
  },
  async summary(customerId: string, control?: RequestControl) {
    const result = await requestApi<unknown>(
      `/customers/${encodeURIComponent(customerId)}/account/summary`,
      control,
    );
    if (!result.ok) return result;
    const parsed = customerAccountSummaryDtoSchema.safeParse(result.value);
    return parsed.success
      ? {
          ok: true,
          value: {
            ...parsed.data,
            invoicedCents: asCents(parsed.data.invoicedCents),
            collectedCents: asCents(parsed.data.collectedCents),
            netBalanceCents: asCents(parsed.data.netBalanceCents),
          },
        }
      : failure(
          "unexpected",
          "El servicio devolvió una respuesta inválida.",
          undefined,
          "errors.invalidResponse",
        );
  },
  async movements(customerId: string, cursor?: string, control?: RequestControl) {
    const query = new URLSearchParams();
    if (cursor !== undefined) query.set("cursor", cursor);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const result = await requestApi<unknown>(
      `/customers/${encodeURIComponent(customerId)}/account/movements${suffix}`,
      control,
    );
    if (!result.ok) return result;
    const parsed = customerAccountMovementPageDtoSchema.safeParse(result.value);
    return parsed.success
      ? {
          ok: true,
          value: {
            nextCursor: parsed.data.nextCursor,
            items: parsed.data.items.map((item) => ({
              ...item,
              debitCents: asCents(item.debitCents),
              creditCents: asCents(item.creditCents),
              appliedCents: item.appliedCents === null ? null : asCents(item.appliedCents),
              balanceCents: asCents(item.balanceCents),
            })),
          },
        }
      : failure(
          "unexpected",
          "El servicio devolvió una respuesta inválida.",
          undefined,
          "errors.invalidResponse",
        );
  },
  async collectionApplications(
    customerId: string,
    cashMovementId: string,
    control?: RequestControl,
  ) {
    const result = await requestApi<unknown>(
      `/customers/${encodeURIComponent(customerId)}/account/collections/${encodeURIComponent(cashMovementId)}`,
      control,
    );
    if (!result.ok) return result;
    const parsed = collectionApplicationsDtoSchema.safeParse(result.value);
    return parsed.success
      ? {
          ok: true as const,
          value: {
            ...parsed.data,
            totalCents: asCents(parsed.data.totalCents),
            creditGeneratedCents: asCents(parsed.data.creditGeneratedCents),
            documents: parsed.data.documents.map((document) => ({
              ...document,
              amountCents: asCents(document.amountCents),
            })),
          },
        }
      : failure(
          "unexpected",
          "El servicio devolvió una respuesta inválida.",
          undefined,
          "errors.invalidResponse",
        );
  },
};
