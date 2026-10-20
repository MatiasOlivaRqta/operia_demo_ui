import { describe, expect, it } from "vitest";
import {
  mapCashCloseInput,
  mapCashMovement,
  mapCashOpenInput,
  mapCashReceipt,
  mapCashSession,
  mapCashTotals,
  mapCollectPaymentInput,
} from "@/features/cash/mappers";
import { toCents } from "@/lib/money";

describe("cash DTO mappers", () => {
  it("maps server session status, totals, and movement fields to UI models", () => {
    const session = mapCashSession(
      {
        id: "00000000-0000-4000-8000-000000000001",
        status: "OPEN",
        openedAt: "2026-10-10T12:00:00.000Z",
        openedBy: { name: "Ana" },
        openingBalanceCents: 100,
      },
      "company-1",
    );
    expect(session).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      status: "open",
      companyId: "company-1",
    });
    expect(
      mapCashTotals({
        sessionId: "00000000-0000-4000-8000-000000000001",
        openedAt: "2026-10-10T12:00:00.000Z",
        asOf: "2026-10-10T12:00:00.000Z",
        openingBalanceCents: 100,
        byMethod: { CASH: 10, TRANSFER: 20, CARD: 30 },
        netCollectedCents: 60,
        movementsCount: 3,
        theoreticalCashCents: 110,
      }).byMethod,
    ).toEqual({ Efectivo: 10, Transferencia: 20, Tarjeta: 30 });
    expect(
      mapCashMovement({
        id: "m1",
        occurredAt: "2026-10-10T12:00:00.000Z",
        type: "COBRO",
        customerId: "c1",
        customerName: "Cliente",
        receiptNumber: "R-1",
        documentNumber: null,
        paymentMethod: "TRANSFER",
        amountCents: 20,
      }),
    ).toMatchObject({
      date: "2026-10-10T12:00:00.000Z",
      documentNumber: null,
      paymentMethod: "Transferencia",
    });
  });

  it("maps all payment methods and omits empty optional request fields", () => {
    expect(mapCashOpenInput({ openingBalanceCents: toCents(1000) })).toEqual({
      openingBalanceCents: 100000,
    });
    expect(mapCashCloseInput({ declaredBalanceCents: toCents(1000), observation: " " })).toEqual({
      declaredBalanceCents: 100000,
    });
    for (const [paymentMethod, dtoMethod] of [
      ["Efectivo", "CASH"],
      ["Transferencia", "TRANSFER"],
      ["Tarjeta", "CARD"],
    ] as const) {
      expect(
        mapCollectPaymentInput({
          amountCents: toCents(1),
          customerId: "c1",
          paymentMethod,
        }),
      ).toEqual({ amountCents: 100, customerId: "c1", paymentMethod: dtoMethod });
    }
    expect(
      mapCollectPaymentInput({
        amountCents: toCents(1),
        customerId: "c1",
        documentId: "doc-1",
        paymentMethod: "Efectivo",
      }).documentId,
    ).toBe("doc-1");
  });

  it("maps a receipt and its applications", () => {
    const receipt = mapCashReceipt({
      receiptNumber: "R-1",
      movementId: "m1",
      occurredAt: "2026-10-10T12:00:00.000Z",
      customerId: "c1",
      customerName: "Cliente",
      paymentMethod: "CARD",
      amountCents: 150,
      documentId: "doc-1",
      applications: [{ documentId: "doc-1", documentNumber: "F-1", amountCents: 100 }],
      creditGeneratedCents: 50,
      customerCreditCents: 50,
    });
    expect(receipt.paymentMethod).toBe("Tarjeta");
    expect(receipt.applications[0]?.amountCents).toBe(100);
    expect(receipt.creditGeneratedCents).toBe(50);
  });
});
