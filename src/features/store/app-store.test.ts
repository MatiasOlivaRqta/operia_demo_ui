import { describe, expect, it } from "vitest";
import { appReducer, initialState } from "@/features/store/app-store";
import { asCents } from "@/lib/money";

describe("add-customer-movement reducer action", () => {
  it("appends a movement once and ignores duplicate ids", () => {
    const customer = initialState.customers.find((entry) => entry.id === "distribuidora-norte");
    if (!customer) throw new Error("Missing fixture customer");
    const movement = {
      amountCents: asCents(12500),
      date: "2026-10-08T12:00:00.000Z",
      description: "Comprobante 0001-00000001",
      documentId: "pv-1",
      id: "account-pv-1",
      type: "Factura" as const,
    };
    const action = {
      type: "add-customer-movement" as const,
      companyId: customer.companyId,
      customerId: customer.id,
      movement,
    };
    const once = appReducer(initialState, action);
    const twice = appReducer(once, action);
    expect(once.customers.find((entry) => entry.id === customer.id)?.movements.at(-1)).toEqual(
      movement,
    );
    expect(twice).toBe(once);
  });
});
