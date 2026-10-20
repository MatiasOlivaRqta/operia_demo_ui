import { afterEach, describe, expect, it, vi } from "vitest";
import { cashApi } from "@/data/http/cash-api";
import { toCents } from "@/lib/money";

afterEach(() => vi.unstubAllGlobals());

const stamp = "2026-10-10T12:00:00.000Z";
const sessionId = "00000000-0000-4000-8000-000000000001";
const sessionDto = {
  id: sessionId,
  status: "OPEN",
  openedAt: stamp,
  openedBy: { name: "Ana" },
  openingBalanceCents: 100000,
};
const receiptDto = {
  receiptNumber: "R-1",
  movementId: "movement-1",
  occurredAt: stamp,
  customerId: "customer-1",
  customerName: "Cliente",
  paymentMethod: "CARD",
  amountCents: 100,
  documentId: null,
  applications: [],
  creditGeneratedCents: 0,
  customerCreditCents: 0,
};

describe("cashApi HTTP adapter", () => {
  it("uses server routes, exact bodies, encoded ids, query params, and idempotency key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(sessionDto))
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, pageSize: 25, total: 0 }))
      .mockResolvedValueOnce(Response.json(sessionDto, { status: 201 }))
      .mockResolvedValueOnce(Response.json(sessionDto))
      .mockResolvedValueOnce(Response.json(receiptDto, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await cashApi.current()).ok).toBe(true);
    expect(await cashApi.totals()).toEqual({ ok: true, value: null });
    expect(
      await cashApi.movements({ sessionId: "session /1", page: 1, pageSize: 25 }),
    ).toMatchObject({ ok: true, value: { total: 0, pageSize: 25 } });
    await cashApi.open({ openingBalanceCents: toCents(1000) });
    await cashApi.close("session /1", { declaredBalanceCents: toCents(2842), observation: " " });
    const collected = await cashApi.collectPayment(
      "session /1",
      { customerId: "customer-1", amountCents: toCents(1), paymentMethod: "Tarjeta" },
      "attempt-uuid",
    );

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/cash/sessions/current",
      "/api/cash/sessions/current/totals",
      "/api/cash/movements?sessionId=session+%2F1&page=1&pageSize=25",
      "/api/cash/sessions",
      "/api/cash/sessions/session%20%2F1/close",
      "/api/cash/sessions/session%20%2F1/collections",
    ]);
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({ openingBalanceCents: 100000 }),
    );
    expect(fetchMock.mock.calls[4]?.[1]?.body).toBe(
      JSON.stringify({ declaredBalanceCents: 284200 }),
    );
    expect(fetchMock.mock.calls[5]?.[1]?.body).toBe(
      JSON.stringify({ customerId: "customer-1", amountCents: 100, paymentMethod: "CARD" }),
    );
    expect(fetchMock.mock.calls[5]?.[1]?.headers).toMatchObject({
      "Idempotency-Key": "attempt-uuid",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("companyId");
    expect(collected).toMatchObject({ ok: true, value: { receiptNumber: "R-1" } });
  });

  it("returns generic failures for responses outside the server contract", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ...sessionDto, openedAt: undefined }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await cashApi.current()).toEqual({
      ok: false,
      error: {
        code: "unexpected",
        key: "errors.invalidResponse",
        message: "El servicio devolvió una respuesta inválida.",
      },
    });
  });

  it("rejects idempotency keys outside the server's 8 to 100 character range before sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await cashApi.collectPayment(
      sessionId,
      { customerId: "customer-1", amountCents: toCents(1), paymentMethod: "Efectivo" },
      "short",
    );
    expect(result).toMatchObject({ ok: false, error: { code: "validation" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves conflict and validation errors, redirects on 401, and hides network details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { code: "conflict", message: "Caja abierta" } }, { status: 409 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: "validation",
              message: "Datos inválidos",
              fieldErrors: { observation: ["Obligatoria"] },
            },
          },
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { code: "unauthenticated", message: "No" } }, { status: 401 }),
      );
    const dispatchEvent = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { pathname: "/caja" }, dispatchEvent });
    const conflict = await cashApi.open({ openingBalanceCents: toCents(0) });
    expect(conflict).toMatchObject({ ok: false, error: { code: "conflict" } });
    const validation = await cashApi.open({ openingBalanceCents: toCents(0) });
    expect(validation).toMatchObject({
      ok: false,
      error: { code: "validation", fieldErrors: { observation: "Obligatoria" } },
    });
    const unauthorized = await cashApi.current();
    expect(unauthorized).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    expect(dispatchEvent).toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sensitive detail")));
    expect(await cashApi.current()).toMatchObject({
      ok: false,
      error: {
        message: "No pudimos conectar con el servicio. Revisá tu conexión e intentá de nuevo.",
      },
    });
  });
});
