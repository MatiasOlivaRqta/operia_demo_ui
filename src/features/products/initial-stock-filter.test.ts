import { describe, expect, it } from "vitest";
import { parseInitialLowStock } from "@/features/products/initial-stock-filter";

describe("parseInitialLowStock", () => {
  it("accepts only the exact low value", () => {
    expect(parseInitialLowStock("low")).toBe(true);
    expect(parseInitialLowStock("all")).toBe(false);
    expect(parseInitialLowStock("LOW")).toBe(false);
    expect(parseInitialLowStock(["low"])).toBe(false);
    expect(parseInitialLowStock(undefined)).toBe(false);
  });
});
