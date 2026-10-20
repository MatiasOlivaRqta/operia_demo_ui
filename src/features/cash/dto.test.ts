import { describe, expect, it } from "vitest";
import {
  cashMovementPageDtoSchema,
  cashReceiptDtoSchema,
  cashSessionDtoSchema,
  cashTotalsDtoSchema,
  customerAccountDtoSchema,
} from "@/features/cash/dto";

const timestamp = "2026-10-10T12:00:00.000-03:00";
const sessionId = "00000000-0000-4000-8000-000000000001";

describe("cash server DTO schemas", () => {
  it("accepts the server's open session, totals, movement page, and receipt shapes", () => {
    expect(
      cashSessionDtoSchema.safeParse({
        id: sessionId,
        status: "OPEN",
        openedAt: timestamp,
        openedBy: { name: "Ana" },
        openingBalanceCents: 100000,
      }).success,
    ).toBe(true);
    expect(
      cashTotalsDtoSchema.safeParse({
        sessionId,
        openedAt: timestamp,
        asOf: timestamp,
        openingBalanceCents: 100000,
        byMethod: { CASH: 25, TRANSFER: 0, CARD: 0 },
        netCollectedCents: 25,
        movementsCount: 1,
        theoreticalCashCents: 100025,
      }).success,
    ).toBe(true);
    expect(
      cashMovementPageDtoSchema.safeParse({
        items: [
          {
            id: "movement-1",
            occurredAt: timestamp,
            type: "COBRO",
            customerId: "customer-1",
            customerName: "Cliente",
            receiptNumber: "R-1",
            documentNumber: null,
            paymentMethod: "TRANSFER",
            amountCents: 25,
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
      }).success,
    ).toBe(true);
    expect(
      cashReceiptDtoSchema.safeParse({
        receiptNumber: "R-1",
        movementId: "movement-1",
        occurredAt: timestamp,
        customerId: "customer-1",
        customerName: "Cliente",
        paymentMethod: "CASH",
        amountCents: 25,
        documentId: null,
        applications: [],
        creditGeneratedCents: 25,
        customerCreditCents: 25,
      }).success,
    ).toBe(true);
  });

  it("accepts customer account data and rejects incomplete or invalid contracts", () => {
    const account = {
      customerId: "customer-1",
      debtCents: 100,
      creditCents: 0,
      netBalanceCents: 100,
      pending: {
        page: 1,
        pageSize: 100,
        total: 1,
        items: [
          {
            id: "doc-1",
            internalNumber: "0001-00000010",
            date: timestamp,
            totalCents: 100,
            paidCents: 0,
            pendingCents: 100,
          },
        ],
      },
    };
    expect(customerAccountDtoSchema.safeParse(account).success).toBe(true);
    expect(customerAccountDtoSchema.safeParse({ ...account, debtCents: undefined }).success).toBe(
      false,
    );
    const movementPage = {
      items: [
        {
          id: "movement-1",
          occurredAt: timestamp,
          type: "COBRO",
          customerId: "customer-1",
          customerName: "Cliente",
          receiptNumber: "R-1",
          documentNumber: null,
          paymentMethod: "BITCOIN",
          amountCents: 25,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    };
    expect(cashMovementPageDtoSchema.safeParse(movementPage).success).toBe(false);
    expect(
      cashMovementPageDtoSchema.safeParse({
        ...movementPage,
        items: [{ ...movementPage.items[0], paymentMethod: "CASH", amountCents: 1.5 }],
      }).success,
    ).toBe(false);
    expect(
      cashSessionDtoSchema.safeParse({ id: sessionId, status: "OPEN", openingBalanceCents: 0 })
        .success,
    ).toBe(false);
  });

  it("ignores extra response fields but still rejects a missing required field", () => {
    const session = {
      id: sessionId,
      status: "OPEN",
      openedAt: timestamp,
      openedBy: { name: "Ana" },
      openingBalanceCents: 100000,
      futureBackendField: "ignored",
    };

    expect(cashSessionDtoSchema.parse(session)).not.toHaveProperty("futureBackendField");
    expect(cashSessionDtoSchema.safeParse({ ...session, openedBy: undefined }).success).toBe(false);
  });
});
