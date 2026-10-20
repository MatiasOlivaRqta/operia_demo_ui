import { afterEach, describe, expect, it, vi } from "vitest";
import { customerAccountApi } from "@/data/http/customer-account-api";

afterEach(() => vi.unstubAllGlobals());

describe("customer account HTTP adapter", () => {
  it("requests the first 100 pending documents and maps debt, credit, and pending amounts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        customerId: "customer/1",
        debtCents: 1000,
        creditCents: 200,
        netBalanceCents: 800,
        pending: {
          page: 1,
          pageSize: 100,
          total: 101,
          items: [
            {
              id: "doc-1",
              internalNumber: "0001-00000010",
              date: "2026-10-10T12:00:00.000Z",
              totalCents: 1000,
              paidCents: 250,
              pendingCents: 750,
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await customerAccountApi.get("customer/1");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/customers/customer%2F1/account?page=1&pageSize=100",
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        debtCents: 1000,
        creditCents: 200,
        pending: { total: 101, items: [{ pendingCents: 750 }] },
      },
    });
  });

  it("requests summary and movement routes and encodes the optional cursor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          customerId: "c1",
          invoicedCents: 1000,
          collectedCents: 250,
          netBalanceCents: 750,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: "collection:1",
              kind: "COLLECTION",
              occurredAt: "2026-10-10T12:00:00.000Z",
              reference: "R-1",
              documentNumber: null,
              documentId: null,
              cashMovementId: "movement-1",
              debitCents: 0,
              creditCents: 500,
              appliedCents: null,
              balanceCents: -500,
            },
          ],
          nextCursor: "opaque+/=",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(await customerAccountApi.summary("c1")).toMatchObject({ ok: true });
    expect(await customerAccountApi.movements("c1", "opaque+/=")).toMatchObject({
      ok: true,
      value: {
        items: [{ cashMovementId: "movement-1", documentId: null }],
        nextCursor: "opaque+/=",
      },
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/customers/c1/account/summary",
      "/api/customers/c1/account/movements?cursor=opaque%2B%2F%3D",
    ]);
  });

  it("rejects an invalid summary response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ customerId: "c1" })));
    expect(await customerAccountApi.summary("c1")).toMatchObject({
      ok: false,
      error: { code: "unexpected" },
    });
  });

  it("loads collection applications and preserves not found errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          cashMovementId: "movement/1",
          receiptNumber: "R-9",
          paymentMethod: "CARD",
          occurredAt: "2026-10-10T12:00:00.000Z",
          totalCents: 5000,
          documents: [
            {
              documentId: "doc-1",
              documentNumber: "0001-00000001",
              amountCents: 4000,
              status: "PARTIAL",
            },
          ],
          creditGeneratedCents: 1000,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { code: "not_found", message: "No encontrado." } }, { status: 404 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await customerAccountApi.collectionApplications("customer/1", "movement/1"),
    ).toMatchObject({
      ok: true,
      value: {
        documents: [{ documentId: "doc-1", amountCents: 4000, status: "PARTIAL" }],
        creditGeneratedCents: 1000,
      },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/customers/customer%2F1/account/collections/movement%2F1",
    );
    expect(await customerAccountApi.collectionApplications("customer/1", "missing")).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
  });
});
