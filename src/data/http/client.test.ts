import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "@/data/http/client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("same-origin HTTP client", () => {
  it("uses same-origin credentials and parses JSON success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "c1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestApi<{ id: string }>("/customers")).resolves.toEqual({
      ok: true,
      value: { id: "c1" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/customers", {
      body: undefined,
      credentials: "same-origin",
      headers: { "Accept-Language": "es" },
      method: "GET",
      signal: undefined,
    });
  });

  it("passes custom headers alongside the JSON content type and forwards the signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await requestApi("/documents", {
      body: { customerId: "c1" },
      headers: { "Idempotency-Key": "attempt-1" },
      method: "POST",
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/documents", {
      body: JSON.stringify({ customerId: "c1" }),
      credentials: "same-origin",
      headers: {
        "Accept-Language": "es",
        "Content-Type": "application/json",
        "Idempotency-Key": "attempt-1",
      },
      method: "POST",
      signal: controller.signal,
    });
  });

  it("sends the active supported document language and falls back to Spanish", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { documentElement: { lang: "en" } });
    await requestApi("/customers");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { "Accept-Language": "en" } });

    vi.stubGlobal("document", { documentElement: { lang: "fr" } });
    await requestApi("/customers");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: { "Accept-Language": "es" } });
  });

  it("propagates an aborted request", async () => {
    const aborted = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    await expect(requestApi("/products", { signal: new AbortController().signal })).rejects.toBe(
      aborted,
    );
  });

  it.each([
    ["not_found", "not_found"],
    ["forbidden", "forbidden"],
    ["conflict", "conflict"],
    ["business_rule", "business_rule"],
    ["rate_limited", "rate_limited"],
    ["unexpected", "unexpected"],
  ] as const)("maps %s API failures", async (apiCode, expectedCode) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: apiCode, message: "Fallo" } }), {
          status: 409,
        }),
      ),
    );
    await expect(requestApi("/customers/c1")).resolves.toEqual({
      ok: false,
      error: {
        code: expectedCode,
        message: expectedCode === "unexpected" ? "No pudimos completar la solicitud." : "Fallo",
        ...(expectedCode === "unexpected" ? { key: "errors.requestFailed" } : {}),
      },
    });
  });

  it.each([
    [undefined, "", "errors.forbidden"],
    ["No tenés permiso para hacer esto.", "No tenés permiso para hacer esto.", undefined],
  ] as const)(
    "maps forbidden without replacing a server message",
    async (serverMessage, message, key) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json(
            {
              error: { code: "forbidden", ...(serverMessage ? { message: serverMessage } : {}) },
            },
            { status: 403 },
          ),
        ),
      );

      await expect(requestApi("/cash")).resolves.toEqual({
        ok: false,
        error: { code: "forbidden", message, ...(key ? { key } : {}) },
      });
    },
  );

  it("maps validation field errors for forms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "validation",
              message: "Revisá los datos",
              fieldErrors: { cuit: ["CUIT inválido"] },
            },
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(requestApi("/customers")).resolves.toEqual({
      ok: false,
      error: {
        code: "validation",
        message: "Revisá los datos",
        fieldErrors: { cuit: "CUIT inválido" },
      },
    });
  });

  it("preserves the HTTP status for unavailable integrations", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "unexpected", message: "No disponible" } },
            { status: 503 },
          ),
        ),
    );
    await expect(requestApi("/telegram/link-token", { method: "POST" })).resolves.toMatchObject({
      ok: false,
      error: { code: "unexpected", status: 503, key: "errors.requestFailed" },
    });
  });

  it("redirects protected API requests on 401 but lets login show its generic error", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/clientes" }, dispatchEvent });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: "unauthenticated", message: "Sesión vencida" } }),
          {
            status: 401,
          },
        ),
      ),
    );

    await requestApi("/auth/me");
    expect(dispatchEvent).toHaveBeenCalled();
    dispatchEvent.mockClear();
    await requestApi("/auth/login", { method: "POST", body: {}, redirectOnUnauthorized: false });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
