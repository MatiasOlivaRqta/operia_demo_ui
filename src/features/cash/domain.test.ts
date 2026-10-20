import { describe, expect, it } from "vitest";
import { calculateCashDifference, calculatePaymentMethodTotal } from "@/features/cash/domain";
import { cashMovements, cashSession } from "@/features/cash/mock-data";
import type { CashMovement } from "@/features/cash/types";
import { toCents } from "@/lib/money";

describe("cash calculations", () => {
  it("sums local payments by method", () => {
    expect(calculatePaymentMethodTotal(cashMovements, "Efectivo")).toBe(toCents(184200));
  });

  it("calculates the local difference against theoretical cash", () => {
    expect(calculateCashDifference(cashSession, cashMovements, toCents(300000))).toBe(
      toCents(15800),
    );
  });

  it("keeps local movement values modeled without a reference property", () => {
    const movement: CashMovement = {
      ...cashMovements[0]!,
      documentNumber: null,
    };
    expect(movement.documentNumber).toBeNull();
  });
});
