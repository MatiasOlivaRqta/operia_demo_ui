export type CashActionDecision = "wait" | "open" | "discard" | "none";

export function decideCashAction(
  action: string | null,
  isLoading: boolean,
  hasOpenSession: boolean,
  alreadyHandled = false,
): CashActionDecision {
  if (action !== "cobro" || alreadyHandled) return "none";
  if (isLoading) return "wait";
  return hasOpenSession ? "open" : "discard";
}
