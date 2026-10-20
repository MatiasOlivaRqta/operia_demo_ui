import { afterEach, describe, expect, it, vi } from "vitest";
import { documentQueryString, documentsApi } from "@/data/http/documents-api";

afterEach(() => vi.unstubAllGlobals());

describe("DocumentsApi HTTP adapter", () => {
  it("omits empty/all query values and serializes customer and pagination", () => {
    expect(documentQueryString({ status: "all", search: " " })).toBe("");
    expect(
      documentQueryString({ customerId: "c1", status: "COMPLETED", page: 1, pageSize: 100 }),
    ).toBe("?status=COMPLETED&customerId=c1&page=1&pageSize=100");
  });

  it("serializes each payment status as a server filter", () => {
    for (const status of ["PENDING", "PARTIAL", "COMPLETED", "CANCELLED"] as const) {
      expect(documentQueryString({ status })).toBe(`?status=${status}`);
    }
  });

  it("returns a newly emitted document as pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          cancelledBy: null,
          companyId: "company-1",
          customerId: "customer-1",
          customerName: "Customer",
          date: "2026-08-26",
          id: "document-1",
          internalNumber: "0001-00000001",
          items: [],
          pointOfSale: "0001",
          pendingCents: 10000,
          status: "PENDING",
          totalCents: 10000,
        }),
      ),
    );
    const result = await documentsApi.create({ customerId: "customer-1", items: [] }, "attempt-1");
    expect(result.ok && result.value.status).toBe("PENDING");
  });

  it("sends the idempotency key and encodes cancellation ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await documentsApi.create({ customerId: "c1", items: [] }, "attempt-1");
    await documentsApi.cancel("doc / 1", "Duplicado");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      "Accept-Language": "es",
      "Content-Type": "application/json",
      "Idempotency-Key": "attempt-1",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ customerId: "c1", items: [] }),
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/documents/doc%20%2F%201/cancellation");
  });

  it("loads and maps document collection details, and preserves not found errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              kind: "PAYMENT",
              occurredAt: "2026-10-10T12:00:00.000Z",
              amountCents: 2500,
              paymentMethod: "TRANSFER",
              receiptNumber: "R-10",
              cashMovementId: "movement-1",
            },
          ],
          totalCents: 3000,
          paidCents: 2500,
          pendingCents: 500,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { code: "not_found", message: "No encontrado." } }, { status: 404 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await documentsApi.collections("doc / 1")).toMatchObject({
      ok: true,
      value: { items: [{ amountCents: 2500, paymentMethod: "TRANSFER" }], paidCents: 2500 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/documents/doc%20%2F%201/collections");
    expect(await documentsApi.collections("missing")).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
  });
});
