import { createElement, type ComponentProps, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerPicker } from "@/components/common/customer-picker";
import type { Customer } from "@/features/customers/types";
import { renderWithIntl } from "@/test/render-with-intl";

const { customerSearchResult } = vi.hoisted(() => ({
  customerSearchResult: {
    data: { items: [] as Customer[], page: 1, pageSize: 10, total: 0 },
    error: null as Error | null,
    isFetching: false,
    isLoading: false,
  },
}));

vi.mock("@/data/queries", () => ({
  useCustomerSearch: () => customerSearchResult,
}));

vi.mock("@base-ui/react/combobox", () => {
  const wrapper = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const root = ({ children, value }: { children?: ReactNode; value?: Customer | null }) =>
    createElement("div", null, value?.commercialName, children);

  return {
    Combobox: {
      Root: root,
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

afterEach(() => {
  customerSearchResult.data = { items: [], page: 1, pageSize: 10, total: 0 };
  customerSearchResult.error = null;
  customerSearchResult.isFetching = false;
  customerSearchResult.isLoading = false;
  vi.restoreAllMocks();
});

describe("CustomerPicker", () => {
  it("keeps rendering the selected customer when it is absent from search results", () => {
    const selected: Customer = {
      address: "Calle 1",
      city: "Buenos Aires",
      commercialName: "Cliente seleccionado",
      companyId: "company-1",
      contactEmail: "contacto@example.com",
      contactName: "Contacto",
      contactPhone: "1111",
      documentNumber: "20-12345678-6",
      documentType: "CUIT/CUIL",
      fiscalAddress: "Calle 1",
      id: "customer-1",
      legalName: "Cliente seleccionado SRL",
      locality: "Centro",
      movements: [],
      personType: "Jurídica",
      postalCode: "1000",
      priceList: "Minorista",
      province: "Buenos Aires",
      status: "active",
      vatCondition: "Responsable inscripto",
    };

    const markup = renderWithIntl(
      createElement(CustomerPicker, { id: "customer", value: selected, onSelect: vi.fn() }),
    );

    expect(markup).toContain(selected.commercialName);
    expect(markup).toContain("Buscar cliente por nombre, documento o contacto");
  });

  it("announces when more customers match than are shown", () => {
    customerSearchResult.data = {
      items: Array.from(
        { length: 10 },
        (_, index) =>
          ({
            commercialName: `Cliente ${index + 1}`,
            id: `customer-${index + 1}`,
          }) as Customer,
      ),
      page: 1,
      pageSize: 10,
      total: 37,
    };

    const markup = renderWithIntl(
      createElement(CustomerPicker, { id: "customer", value: null, onSelect: vi.fn() }),
    );

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Mostrando 10 de 37. Afiná la búsqueda para ver más.");
  });

  it("does not announce when all matching customers are shown", () => {
    customerSearchResult.data = {
      items: [{ commercialName: "Cliente uno", id: "customer-1" } as Customer],
      page: 1,
      pageSize: 10,
      total: 1,
    };

    const markup = renderWithIntl(
      createElement(CustomerPicker, { id: "customer", value: null, onSelect: vi.fn() }),
    );

    expect(markup).not.toContain("Mostrando");
  });

  it("does not announce when there are no matching customers", () => {
    const markup = renderWithIntl(
      createElement(CustomerPicker, { id: "customer", value: null, onSelect: vi.fn() }),
    );

    expect(markup).toContain("No encontramos clientes activos.");
    expect(markup).not.toContain("Mostrando");
  });

  it("renders the customer search affordance in English", () => {
    customerSearchResult.data = {
      items: Array.from(
        { length: 10 },
        (_, index) =>
          ({
            commercialName: `Customer ${index + 1}`,
            id: `customer-${index + 1}`,
          }) as Customer,
      ),
      page: 1,
      pageSize: 10,
      total: 37,
    };
    const markup = renderWithIntl(
      createElement(CustomerPicker, { id: "customer", value: null, onSelect: vi.fn() }),
      "en",
    );
    expect(markup).toContain("Search customers by name, document, or contact");
    expect(markup).toContain("Showing 10 of 37. Refine your search to see more.");
  });
});
