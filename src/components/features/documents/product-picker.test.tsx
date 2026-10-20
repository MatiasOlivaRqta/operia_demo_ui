import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductPicker } from "@/components/features/documents/product-picker";
import type { ProductSummary } from "@/features/products/types";
import { asCents } from "@/lib/money";
import { renderWithIntl } from "@/test/render-with-intl";

const { productSearchResult } = vi.hoisted(() => ({
  productSearchResult: {
    data: { items: [] as ProductSummary[], page: 1, pageSize: 10, total: 0 },
    error: null as Error | null,
    isFetching: false,
    isLoading: false,
  },
}));

vi.mock("@/data/queries", () => ({
  useProductSearch: () => productSearchResult,
}));

vi.mock("@base-ui/react/combobox", () => {
  const wrapper = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const list = ({ children }: { children?: ReactNode }) => createElement("ul", null, children);
  const item = ({ children }: { children?: ReactNode }) =>
    createElement("li", { role: "option" }, children);

  return {
    Combobox: {
      Root: wrapper,
      Portal: wrapper,
      Positioner: wrapper,
      Popup: wrapper,
      List: list,
      Empty: wrapper,
      Item: item,
      Input: () => null,
    },
  };
});

afterEach(() => {
  productSearchResult.data = { items: [], page: 1, pageSize: 10, total: 0 };
  productSearchResult.error = null;
  productSearchResult.isFetching = false;
  productSearchResult.isLoading = false;
  vi.restoreAllMocks();
});

describe("ProductPicker", () => {
  it("announces additional results outside selectable options", () => {
    productSearchResult.data = {
      items: Array.from({ length: 10 }, (_, index) => ({
        barcode: "",
        category: "General",
        categoryId: "cat-general",
        companyId: "company-1",
        costCents: asCents(100),
        id: `product-${index + 1}`,
        lowStock: false,
        minimumStock: 0,
        name: `Producto ${index + 1}`,
        priceCents: asCents(200),
        sku: `SKU-${index + 1}`,
        status: "active",
        stock: 5,
        unit: "unidad",
      })),
      page: 1,
      pageSize: 10,
      total: 12,
    };

    const markup = renderWithIntl(
      createElement(ProductPicker, { id: "product", value: null, onSelect: vi.fn() }),
    );

    expect(markup).toContain("Mostrando 10 de 12. Afiná la búsqueda para ver más.");
    expect(markup.match(/role="option"/g)).toHaveLength(10);
    expect(markup).toContain('aria-live="polite"');
    const messageIndex = markup.indexOf("Mostrando 10 de 12.");
    expect(messageIndex).toBeGreaterThan(markup.indexOf("</ul>"));
  });

  it("translates the additional-results message into English", () => {
    productSearchResult.data = {
      items: Array.from({ length: 10 }, (_, index) => ({
        barcode: "",
        category: "General",
        categoryId: "cat-general",
        companyId: "company-1",
        costCents: asCents(100),
        id: `product-${index + 1}`,
        lowStock: false,
        minimumStock: 0,
        name: `Product ${index + 1}`,
        priceCents: asCents(200),
        sku: `SKU-${index + 1}`,
        status: "active",
        stock: 5,
        unit: "unit",
      })),
      page: 1,
      pageSize: 10,
      total: 12,
    };
    const markup = renderWithIntl(
      createElement(ProductPicker, { id: "product", value: null, onSelect: vi.fn() }),
      "en",
    );
    expect(markup).toContain("Showing 10 of 12. Refine your search to see more.");
  });
});
