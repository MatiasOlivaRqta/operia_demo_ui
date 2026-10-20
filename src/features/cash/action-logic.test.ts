import { describe, expect, it } from "vitest";
import { decideCashAction } from "@/features/cash/action-logic";

describe("cash URL action", () => {
  it("waits for the session, opens only with an open session, and discards without one", () => {
    expect(decideCashAction("cobro", true, false)).toBe("wait");
    expect(decideCashAction("cobro", false, true)).toBe("open");
    expect(decideCashAction("cobro", false, false)).toBe("discard");
  });

  it("does not reopen when the action was handled or is absent after reload", () => {
    expect(decideCashAction("cobro", false, true, true)).toBe("none");
    expect(decideCashAction(null, false, true)).toBe("none");
  });
});
