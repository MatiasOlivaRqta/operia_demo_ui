import { createElement, type ComponentProps, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/features/products/product-form";
import { productSchema } from "@/features/products/schemas";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { renderWithIntl } from "@/test/render-with-intl";

const { productState } = vi.hoisted(() => ({
  productState: {
    data: undefined as unknown,
    error: null,
    isFetching: false,
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/data/queries", () => ({
  useCan: () => true,
  useProduct: () => productState,
  useProductCategories: () => ({
    data: { items: [], page: 1, pageSize: 10, total: 0 },
    error: null,
    isFetching: false,
    isLoading: false,
  }),
}));
vi.mock("@/data/mutations", () => ({
  useProductMutations: () => ({ create: vi.fn(), update: vi.fn() }),
  useProductCategoryMutations: () => ({ create: vi.fn() }),
}));
vi.mock("@base-ui/react/combobox", () => {
  const wrapper = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  return {
    Combobox: {
      Root: ({
        children,
        value,
      }: {
        children?: ReactNode;
        value?: { description: string } | null;
      }) => createElement("div", { "data-category": value?.description ?? "" }, children),
      Portal: wrapper,
      Positioner: wrapper,
      Popup: wrapper,
      List: wrapper,
      Empty: wrapper,
      Item: wrapper,
      Input: (props: ComponentProps<"input">) => createElement("input", props),
    },
  };
});

describe("ProductForm category", () => {
  it("renders the category combo empty when creating a product", () => {
    productState.data = undefined;
    const markup = renderWithIntl(createElement(ProductForm, { mode: "create" }));
    expect(markup).toContain("Buscar o crear categoría");
    expect(markup).toContain('data-category=""');
  });

  it("renders the saved category when editing a product", () => {
    const product = {
      barcode: "",
      category: "Herramientas",
      categoryId: "cat-herramientas",
      companyId: "company-1",
      costCents: 1000,
      id: "product-1",
      lowStock: false,
      minimumStock: 1,
      name: "Taladro",
      priceCents: 2000,
      sku: "TAL-1",
      status: "active",
      stock: 3,
      unit: "Unidad",
    };
    productState.data = product;
    const markup = renderWithIntl(
      createElement(ProductForm, { mode: "edit", productId: product.id }),
    );
    expect(markup).toContain(`data-category="${product.category}"`);
  });

  it("requires a category id before submitting", () => {
    const result = productSchema.safeParse({
      barcode: "",
      categoryId: "",
      costPesos: 10,
      minimumStock: 0,
      name: "Taladro",
      pricePesos: 20,
      sku: "TAL-1",
      status: "active",
      unit: "Unidad",
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0]?.message).toBe(
      "validation.product.categoryRequired",
    );
    expect(es.validation.product.categoryRequired).toBe("Ingresá una categoría.");
    expect(en.validation.product.categoryRequired).toBe("Enter a category.");
  });

  it("renders the product form in English", () => {
    productState.data = undefined;
    const markup = renderWithIntl(createElement(ProductForm, { mode: "create" }), "en");
    expect(markup).toContain("Product details");
    expect(markup).toContain("Search or create a category");
    expect(markup).toContain("Minimum stock");
  });
});
