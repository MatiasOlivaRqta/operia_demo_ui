import { describe, expect, it } from "vitest";
import { inventoryQueryString } from "@/data/http/inventory-api";

describe("inventoryQueryString", () => {
  it("omits empty filters and serializes present values", () => {
    expect(inventoryQueryString({})).toBe("");
    expect(inventoryQueryString({ type: "Ingreso", page: 2, pageSize: 5 })).toBe(
      "?type=Ingreso&page=2&pageSize=5",
    );
    expect(
      inventoryQueryString({
        type: "Reversion",
        productId: "p 1",
        from: "2026-10-01",
        to: "2026-10-09",
      }),
    ).toBe("?type=Reversion&productId=p+1&from=2026-10-01&to=2026-10-09");
    expect(inventoryQueryString({ productId: "", from: "", to: "" })).toBe("");
  });
});
