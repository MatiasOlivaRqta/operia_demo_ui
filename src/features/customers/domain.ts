import type { CustomerAccountMovement } from "@/features/customers/types";
import { asCents, type Cents } from "@/lib/money";

export function calculateCustomerBalance(movements: readonly CustomerAccountMovement[]): Cents {
  return asCents(movements.reduce((balance, movement) => balance + movement.amountCents, 0));
}

export function calculateDebits(movements: readonly CustomerAccountMovement[]): Cents {
  return asCents(
    movements.reduce(
      (total, movement) => total + (movement.amountCents > 0 ? movement.amountCents : 0),
      0,
    ),
  );
}

export function calculateCredits(movements: readonly CustomerAccountMovement[]): Cents {
  return asCents(
    movements.reduce(
      (total, movement) => total + (movement.amountCents < 0 ? Math.abs(movement.amountCents) : 0),
      0,
    ),
  );
}
