import type { Cents } from "@/lib/money";

export type CashDialog = "close" | "collection" | "open" | null;

export function collectionDefaultsFor(customerId?: string) {
  return {
    amountCents: "",
    customerId: customerId ?? "",
    documentId: "",
    paymentMethod: "Efectivo" as const,
  };
}

export function decideCashDialogSessionTransition(
  dialog: CashDialog,
  previousHasSession: boolean,
  hasSession: boolean,
): Readonly<{
  cerrarDialogo: boolean;
  messageKey: "sessionClosed" | "openingConflict" | null;
}> {
  if (dialog === "close" || dialog === "collection") {
    if (previousHasSession && !hasSession) {
      return {
        cerrarDialogo: true,
        messageKey: "sessionClosed",
      };
    }
  }

  if (dialog === "open" && !previousHasSession && hasSession) {
    return {
      cerrarDialogo: true,
      messageKey: "openingConflict",
    };
  }

  return { cerrarDialogo: false, messageKey: null };
}

export function calculateIndicativeDifference(
  declaredCents: Cents | null,
  theoreticalCashCents: Cents,
): Cents | null {
  return declaredCents === null ? null : ((declaredCents - theoreticalCashCents) as Cents);
}

export function mapFieldErrorsToFields<Field extends string>(
  fieldErrors: Readonly<Record<string, string>> | undefined,
  allowedFields: readonly Field[],
): Partial<Record<Field, string>> {
  const mapped: Partial<Record<Field, string>> = {};
  for (const field of allowedFields) {
    const message = fieldErrors?.[field];
    if (message) mapped[field] = message;
  }
  return mapped;
}

export function didFingerprintChange(previous: string | null, next: string): boolean {
  return previous !== next;
}

export function createResetIdempotencyState(key: string): { fingerprint: null; key: string } {
  return { fingerprint: null, key };
}
