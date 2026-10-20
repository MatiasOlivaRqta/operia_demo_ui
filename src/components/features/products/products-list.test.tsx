import { describe, expect, it, vi } from "vitest";
import { ProductsList } from "@/components/features/products/products-list";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({
  useCan: () => can("products.write"),
  useInventorySummary: () => ({ data: { lowStockCount: 0 } }),
  useProducts: () => ({
    data: { items: [], page: 1, pageSize: 25, total: 0 },
    error: null,
    isFetching: false,
    isLoading: false,
  }),
}));

describe("ProductsList permissions", () => {
  it("hides product creation without products.write", () => {
    can.mockReturnValue(false);
    expect(renderWithIntl(<ProductsList />)).not.toContain("Nuevo producto");
  });

  it("shows product creation for ADMIN", () => {
    can.mockReturnValue(true);
    expect(renderWithIntl(<ProductsList />)).toContain("Nuevo producto");
  });
});
