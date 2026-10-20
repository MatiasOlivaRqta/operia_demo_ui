import type { CashMovement, CashSession } from "@/features/cash/types";

/** Snapshot-only shape for the demo store; public CashSession stays resource-focused. */
export type LocalCashSession = CashSession & {
  companyId: string;
  movements: readonly CashMovement[];
};
