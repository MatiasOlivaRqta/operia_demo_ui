import { describe, expect, it } from "vitest";
import {
  activeInventoryMovementFilterCount,
  buildInventoryMovementQuery,
  isInventoryMovementDateRangeValid,
  type InventoryMovementFilters,
} from "@/features/products/inventory-movement-filters";

const emptyFilters: InventoryMovementFilters = { type: "", productId: "", from: "", to: "" };

describe("inventory movement filters", () => {
  it("counts only populated filters", () => {
    expect(activeInventoryMovementFilterCount(emptyFilters)).toBe(0);
    expect(
      activeInventoryMovementFilterCount({ ...emptyFilters, type: "Salida", to: "2026-10-09" }),
    ).toBe(2);
  });

  it("validates inclusive date ranges and permits either bound independently", () => {
    expect(isInventoryMovementDateRangeValid("", "2026-10-09")).toBe(true);
    expect(isInventoryMovementDateRangeValid("2026-10-09", "")).toBe(true);
    expect(isInventoryMovementDateRangeValid("2026-10-09", "2026-10-09")).toBe(true);
    expect(isInventoryMovementDateRangeValid("2026-10-10", "2026-10-09")).toBe(false);
  });

  it("builds only selected parameters and skips invalid ranges", () => {
    expect(
      buildInventoryMovementQuery(
        { type: "Reversion", productId: "p1", from: "2026-10-01", to: "2026-10-09" },
        1,
        10,
      ),
    ).toEqual({
      type: "Reversion",
      productId: "p1",
      from: "2026-10-01",
      to: "2026-10-09",
      page: 1,
      pageSize: 10,
    });
    expect(buildInventoryMovementQuery(emptyFilters, 1, 10)).toEqual({ page: 1, pageSize: 10 });
    expect(
      buildInventoryMovementQuery({ ...emptyFilters, from: "2026-10-10", to: "2026-10-09" }, 1, 10),
    ).toBeNull();
  });
});
