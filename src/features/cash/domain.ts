import type { CashMovement, CashSession, PaymentMethod } from "@/features/cash/types";
import { asCents, type Cents } from "@/lib/money";

export function calculatePaymentMethodTotal(
  movements: readonly CashMovement[],
  paymentMethod: PaymentMethod,
): Cents {
  return asCents(
    movements.reduce((total, movement) => {
      if (movement.paymentMethod !== paymentMethod) return total;
      return total + movement.amountCents;
    }, 0),
  );
}

export function calculateTheoreticalCash(
  session: CashSession,
  movements: readonly CashMovement[],
): Cents {
  return asCents(session.openingBalanceCents + calculatePaymentMethodTotal(movements, "Efectivo"));
}

export function calculateCashDifference(
  session: CashSession,
  movements: readonly CashMovement[],
  declaredBalance: Cents,
): Cents {
  return asCents(declaredBalance - calculateTheoreticalCash(session, movements));
}
