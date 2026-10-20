import { describe, expect, it } from "vitest";
import { asCents } from "@/lib/money";
import {
  calculateIndicativeDifference,
  collectionDefaultsFor,
  createResetIdempotencyState,
  decideCashDialogSessionTransition,
  didFingerprintChange,
  mapFieldErrorsToFields,
} from "@/features/cash/dialog-logic";

describe("cash dialog pure logic", () => {
  it("provides collection defaults with an optional fixed customer", () => {
    expect(collectionDefaultsFor()).toEqual({
      amountCents: "",
      customerId: "",
      documentId: "",
      paymentMethod: "Efectivo",
    });
    expect(collectionDefaultsFor("customer-1")).toEqual({
      amountCents: "",
      customerId: "customer-1",
      documentId: "",
      paymentMethod: "Efectivo",
    });
  });

  it("calculates an indicative difference from server cash totals", () => {
    expect(calculateIndicativeDifference(asCents(280000), asCents(284200))).toBe(-4200);
    expect(calculateIndicativeDifference(null, asCents(284200))).toBeNull();
  });

  it("maps only known field errors without inspecting error messages", () => {
    expect(
      mapFieldErrorsToFields({ observation: "Required", unknown: "ignored" }, ["observation"]),
    ).toEqual({ observation: "Required" });
  });

  it("compares collection fingerprints", () => {
    const fingerprint = "customer-1|document-1|1000|CASH";
    expect(didFingerprintChange(fingerprint, fingerprint)).toBe(false);
    expect(didFingerprintChange(fingerprint, "customer-1||1000|CASH")).toBe(true);
  });

  it("starts a fresh idempotency attempt after closing the collection dialog", () => {
    expect(createResetIdempotencyState("next-key")).toEqual({
      fingerprint: null,
      key: "next-key",
    });
  });

  it("closes collection and close dialogs when the session closes", () => {
    const expected = {
      cerrarDialogo: true,
      messageKey: "sessionClosed",
    };
    expect(decideCashDialogSessionTransition("collection", true, false)).toEqual(expected);
    expect(decideCashDialogSessionTransition("close", true, false)).toEqual(expected);
  });

  it("keeps the open dialog available when the session closes", () => {
    expect(decideCashDialogSessionTransition("open", true, false)).toEqual({
      cerrarDialogo: false,
      messageKey: null,
    });
  });

  it("closes the open dialog when a session opens elsewhere", () => {
    expect(decideCashDialogSessionTransition("open", false, true)).toEqual({
      cerrarDialogo: true,
      messageKey: "openingConflict",
    });
  });

  it("does not close dialogs when the session state has no relevant transition", () => {
    expect(decideCashDialogSessionTransition("collection", true, true)).toEqual({
      cerrarDialogo: false,
      messageKey: null,
    });
    expect(decideCashDialogSessionTransition(null, true, false)).toEqual({
      cerrarDialogo: false,
      messageKey: null,
    });
  });
});
