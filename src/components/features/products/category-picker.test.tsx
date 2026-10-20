import { createElement, type ComponentProps, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryPicker } from "@/components/features/products/category-picker";
import type { ElemSubType } from "@/features/catalog/types";
import { renderWithIntl } from "@/test/render-with-intl";

const category = (id: string, description: string): ElemSubType => ({
  description,
  elemTypeId: "PROD_CAT",
  id,
});

const { searchResult } = vi.hoisted(() => ({
  searchResult: {
    data: { items: [] as ElemSubType[], page: 1, pageSize: 10, total: 0 },
    error: null as Error | null,
    isFetching: false,
    isLoading: false,
  },
}));
const permissions = vi.hoisted(() => ({ productsWrite: true, querySearch: "" }));

vi.mock("@/data/queries", () => ({
  useCan: () => permissions.productsWrite,
  useProductCategories: () => searchResult,
}));
vi.mock("@/lib/use-debounced-value", () => ({ useDebouncedValue: () => permissions.querySearch }));
vi.mock("@/data/mutations", () => ({
  useProductCategoryMutations: () => ({ create: vi.fn() }),
}));
vi.mock("@base-ui/react/combobox", () => {
  const wrapper = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const root = ({ children, value }: { children?: ReactNode; value?: ElemSubType | null }) =>
    createElement("div", null, value?.description, children);
  return {
    Combobox: {
      Root: root,
      Portal: wrapper,
      Positioner: wrapper,
      Popup: wrapper,
      List: wrapper,
      Empty: wrapper,
      Item: ({
        children,
        "data-testid": testId,
      }: {
        children?: ReactNode;
        "data-testid"?: string;
      }) => createElement("div", { "data-option": true, "data-testid": testId }, children),
      Input: (props: ComponentProps<"input">) => createElement("input", props),
    },
  };
});

afterEach(() => {
  searchResult.data = { items: [], page: 1, pageSize: 10, total: 0 };
  searchResult.error = null;
  searchResult.isLoading = false;
  permissions.productsWrite = true;
  permissions.querySearch = "";
});

const render = (value: ElemSubType | null = null, locale: "es" | "en" = "es") =>
  renderWithIntl(
    createElement(CategoryPicker, { id: "category", value, onSelect: vi.fn() }),
    locale,
  );

describe("CategoryPicker", () => {
  it("renders the selected category and the accessible label", () => {
    const markup = render(category("cat-1", "Seguridad"));
    expect(markup).toContain("Seguridad");
    expect(markup).toContain("Buscar o crear categoría");
  });

  it("lists the categories returned by the catalog", () => {
    searchResult.data = {
      items: [category("c1", "Electricidad"), category("c2", "Ferretería")],
      page: 1,
      pageSize: 10,
      total: 2,
    };
    const markup = render();
    expect(markup).toContain("Electricidad");
    expect(markup).toContain("Ferretería");
    expect(markup).not.toContain("Mostrando");
  });

  it("announces more results outside the selectable options", () => {
    searchResult.data = {
      items: Array.from({ length: 10 }, (_, index) => category(`c${index}`, `Categoría ${index}`)),
      page: 1,
      pageSize: 10,
      total: 37,
    };
    const markup = render();
    expect(markup).toContain("Mostrando 10 de 37. Afiná la búsqueda para ver más.");
    expect(markup.match(/data-option/g)).toHaveLength(10);
  });

  it("shows the search error and no create option", () => {
    searchResult.error = new Error("fallo");
    const markup = render();
    expect(markup).toContain("No pudimos buscar categorías.");
    expect(markup).not.toContain("Crear");
  });

  it("explains that there are no categories yet", () => {
    expect(render()).toContain("Todavía no hay categorías.");
  });

  it("renders category search in English", () => {
    const markup = render(null, "en");
    expect(markup).toContain("Search or create a category");
    expect(markup).toContain("There are no categories yet.");
  });

  it("keeps existing categories available but hides creation without products.write", () => {
    permissions.productsWrite = false;
    permissions.querySearch = "Nueva";
    searchResult.data = {
      items: [category("c1", "Electricidad")],
      page: 1,
      pageSize: 10,
      total: 1,
    };
    const markup = render();
    expect(markup).toContain("Electricidad");
    expect(markup).not.toContain("Crear");
  });
});
