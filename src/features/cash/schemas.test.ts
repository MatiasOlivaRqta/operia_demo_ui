import { describe, expect, it } from "vitest";
import { cashCloseSchema, cashOpenSchema, collectPaymentSchema } from "@/features/cash/schemas";

describe("cash form schemas", () => {
  it("parses peso text to cents and enforces server limits", () => {
    expect(cashOpenSchema.safeParse({ openingBalanceCents: "10,5" }).data).toMatchObject({
      openingBalanceCents: 1050,
    });
    expect(cashOpenSchema.safeParse({ openingBalanceCents: "21474836,48" }).success).toBe(false);
    expect(
      collectPaymentSchema.safeParse({
        amountCents: "21474836.48",
        customerId: "c1",
        paymentMethod: "Efectivo",
      }).success,
    ).toBe(false);
    expect(
      collectPaymentSchema.safeParse({
        amountCents: "0,01",
        customerId: "c1",
        paymentMethod: "Efectivo",
      }).data?.amountCents,
    ).toBe(1);
  });

  it("returns field errors for missing, malformed, and non-positive values", () => {
    const open = cashOpenSchema.safeParse({ openingBalanceCents: "" });
    expect(open.success).toBe(false);
    if (open.success) return;
    expect(open.error.issues.map((issue) => issue.path[0])).toContain("openingBalanceCents");
    expect(open.error.issues[0]?.message).toBe("validation.cash.openingRequired");

    const collect = collectPaymentSchema.safeParse({
      amountCents: "1.005",
      customerId: "",
      paymentMethod: "Efectivo",
    });
    expect(collect.success).toBe(false);
    if (collect.success) return;
    expect(collect.error.issues.map((issue) => issue.path[0])).toContain("amountCents");
    expect(collect.error.issues.map((issue) => issue.path[0])).toContain("customerId");
  });

  it("allows an optional close observation and rejects overlong values", () => {
    expect(
      cashCloseSchema.safeParse({ declaredBalanceCents: "0", observation: " " }).data,
    ).toMatchObject({ declaredBalanceCents: 0, observation: "" });
    expect(
      cashCloseSchema.safeParse({ declaredBalanceCents: "1", observation: "x".repeat(501) })
        .success,
    ).toBe(false);
    const tooLong = cashCloseSchema.safeParse({
      declaredBalanceCents: "1",
      observation: "x".repeat(501),
    });
    if (!tooLong.success) expect(tooLong.error.issues[0]?.message).toBe("validation.maxLength|500");
  });
});
