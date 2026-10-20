import { describe, expect, it } from "vitest";
import { decideProductAction } from "@/features/products/action-logic";

describe("product movement URL action", () => {
  it("opens after the product loads and waits while it is unavailable", () => {
    expect(decideProductAction("movimiento", false)).toBe("wait");
    expect(decideProductAction("movimiento", true)).toBe("open");
  });

  it("does not reopen when handled or after reload without the parameter", () => {
    expect(decideProductAction("movimiento", true, true)).toBe("none");
    expect(decideProductAction(null, true)).toBe("none");
  });
});
