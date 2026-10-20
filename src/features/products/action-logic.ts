export type ProductActionDecision = "wait" | "open" | "discard" | "none";

export function decideProductAction(
  action: string | null,
  productAvailable: boolean,
  alreadyHandled = false,
): ProductActionDecision {
  if (action !== "movimiento" || alreadyHandled) return "none";
  return productAvailable ? "open" : "wait";
}
