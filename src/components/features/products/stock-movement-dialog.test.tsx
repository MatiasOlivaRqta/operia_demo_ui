import { describe, expect, it, vi } from "vitest";
import { StockMovementDialog } from "@/components/features/products/stock-movement-dialog";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({
  useCan: (permission: string) => can(permission),
  useProduct: () => ({ data: undefined }),
  useProductMovements: () => ({ data: undefined, isLoading: false, error: null }),
}));
vi.mock("@/data/mutations", () => ({
  useProductMutations: () => ({
    addStockMovement: vi.fn(),
    adjustStock: vi.fn(),
    reverseStockMovement: vi.fn(),
  }),
}));

describe("StockMovementDialog permissions", () => {
  const props = { productId: "product-1", productName: "Taladro" };

  it("hides stock actions without inventory.write or inventory.cancel", () => {
    can.mockReturnValue(false);
    expect(renderWithIntl(<StockMovementDialog {...props} />)).toBe("");
  });

  it("shows stock actions for ADMIN", () => {
    can.mockReturnValue(true);
    expect(renderWithIntl(<StockMovementDialog {...props} />)).toContain("Registrar movimiento");
  });
});
