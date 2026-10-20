import { describe, expect, it } from "vitest";
import { fromCents, parsePesosToCents, percentOf, toCents } from "@/lib/money";

describe("money", () => {
  it("converts pesos to integer centavos with half-up rounding", () => {
    expect(toCents(12.345)).toBe(1235);
    expect(toCents(-12.345)).toBe(-1235);
    expect(fromCents(toCents(12.34))).toBe(12.34);
  });

  it("rounds percentages to a centavo", () => {
    expect(percentOf(toCents(0.05), 10)).toBe(1);
  });

  it("parses peso strings exactly and rejects invalid precision and range", () => {
    expect(parsePesosToCents("10,5")).toBe(1050);
    expect(parsePesosToCents("0,01")).toBe(1);
    expect(parsePesosToCents("21474836,47")).toBe(2_147_483_647);
    for (const invalid of ["1.005", "", "-1", "+1", "1e3", "21474836.48"]) {
      expect(parsePesosToCents(invalid)).toBeNull();
    }
  });

  it("keeps comma-decimal parsing independent from the UI language", () => {
    expect(parsePesosToCents("1234,56")).toBe(123456);
    expect(parsePesosToCents("0,5")).toBe(50);
  });
});
