import type {
  CashMovementQuery,
  CloseCashInput,
  OpenCashInput,
  CollectPaymentInput,
  CashApi,
} from "@/data/api";
import { requestApi } from "@/data/http/client";
import {
  cashMovementPageDtoSchema,
  cashReceiptDtoSchema,
  cashSessionDtoSchema,
  cashTotalsDtoSchema,
} from "@/features/cash/dto";
import {
  mapCashCloseInput,
  mapCashMovementPage,
  mapCashOpenInput,
  mapCashReceipt,
  mapCashSession,
  mapCashTotals,
  mapCollectPaymentInput,
} from "@/features/cash/mappers";
import { failure, type Result } from "@/lib/result";

function contractFailure<T>(): Result<T> {
  return failure(
    "unexpected",
    "El servicio devolvió una respuesta inválida.",
    undefined,
    "errors.invalidResponse",
  );
}

async function parseResponse<Dto, Model>(
  request: Promise<Result<unknown>>,
  schema: { safeParse(data: unknown): { success: true; data: Dto } | { success: false } },
  map: (dto: Dto) => Model,
): Promise<Result<Model>> {
  const result = await request;
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) return contractFailure();
  return { ok: true, value: map(parsed.data) };
}

function queryString(query: CashMovementQuery): string {
  const params = new URLSearchParams({
    sessionId: query.sessionId,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  return `?${params.toString()}`;
}

export const cashApi: CashApi = {
  current: async (control) => {
    const result = await requestApi<unknown>("/cash/sessions/current", control);
    if (!result.ok) return result;
    if (result.value === null) return { ok: true, value: null };
    const parsed = cashSessionDtoSchema.safeParse(result.value);
    return parsed.success ? { ok: true, value: mapCashSession(parsed.data) } : contractFailure();
  },
  totals: async (control) => {
    const result = await requestApi<unknown>("/cash/sessions/current/totals", control);
    if (!result.ok) return result;
    if (result.value === null) return { ok: true, value: null };
    const parsed = cashTotalsDtoSchema.safeParse(result.value);
    return parsed.success ? { ok: true, value: mapCashTotals(parsed.data) } : contractFailure();
  },
  movements: (query, control) =>
    parseResponse(
      requestApi<unknown>(`/cash/movements${queryString(query)}`, control),
      cashMovementPageDtoSchema,
      mapCashMovementPage,
    ),
  open: (input: OpenCashInput) =>
    parseResponse(
      requestApi<unknown>("/cash/sessions", {
        method: "POST",
        body: mapCashOpenInput(input),
      }),
      cashSessionDtoSchema,
      (dto) => mapCashSession(dto),
    ),
  close: (sessionId: string, input: CloseCashInput) =>
    parseResponse(
      requestApi<unknown>(`/cash/sessions/${encodeURIComponent(sessionId)}/close`, {
        method: "POST",
        body: mapCashCloseInput(input),
      }),
      cashSessionDtoSchema,
      (dto) => mapCashSession(dto),
    ),
  collectPayment: (sessionId: string, input: CollectPaymentInput, idempotencyKey: string) =>
    idempotencyKey.length < 8 || idempotencyKey.length > 100
      ? Promise.resolve(
          failure(
            "validation",
            "Revisá los datos ingresados.",
            { "Idempotency-Key": "La clave debe tener entre 8 y 100 caracteres." },
            "errors.validationFailed",
          ),
        )
      : parseResponse(
          requestApi<unknown>(`/cash/sessions/${encodeURIComponent(sessionId)}/collections`, {
            method: "POST",
            headers: { "Idempotency-Key": idempotencyKey },
            body: mapCollectPaymentInput(input),
          }),
          cashReceiptDtoSchema,
          mapCashReceipt,
        ),
};
