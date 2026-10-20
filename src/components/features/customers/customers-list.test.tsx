import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CustomersList } from "@/components/features/customers/customers-list";
import type { Customer } from "@/features/customers/types";
import { scheduleDebouncedValue } from "@/lib/debounce";
import { asCents } from "@/lib/money";
import { renderWithIntl } from "@/test/render-with-intl";

const { useCustomers, useCan } = vi.hoisted(() => ({ useCustomers: vi.fn(), useCan: vi.fn() }));
vi.mock("@/data/queries", () => ({
  useCustomers: (...args: unknown[]) => useCustomers(...args),
  useCan: (...args: unknown[]) => useCan(...args),
}));

describe("CustomersList", () => {
  it("shows the create action only when customers.write is granted", () => {
    useCan.mockReturnValue(false);
    useCustomers.mockReturnValue({
      data: { items: [], page: 1, pageSize: 25, total: 0 },
      error: null,
      isFetching: false,
      isLoading: false,
    });
    expect(renderWithIntl(createElement(CustomersList))).not.toContain("Nuevo cliente");

    useCan.mockReturnValue(true);
    expect(renderWithIntl(createElement(CustomersList))).toContain("Nuevo cliente");
  });

  it("requests the initial server page and renders the visible filter labels and total", () => {
    const customer: Customer = {
      address: "Calle 1",
      city: "Buenos Aires",
      commercialName: "Cliente de prueba",
      companyId: "company-1",
      contactEmail: "contacto@example.com",
      contactName: "Contacto",
      contactPhone: "1111",
      documentNumber: "20-12345678-6",
      documentType: "CUIT/CUIL",
      fiscalAddress: "Calle 1",
      id: "customer-1",
      legalName: "Cliente de prueba SRL",
      locality: "Centro",
      movements: [],
      personType: "Jurídica",
      postalCode: "1000",
      priceList: "Minorista",
      province: "Buenos Aires",
      status: "active",
      vatCondition: "Responsable inscripto",
    };
    useCustomers.mockReturnValue({
      data: { items: [customer], page: 1, pageSize: 25, total: 37 },
      error: null,
      isFetching: false,
      isLoading: false,
    });

    const markup = renderWithIntl(createElement(CustomersList));

    expect(useCustomers).toHaveBeenCalledWith({
      search: "",
      status: "all",
      vatCondition: "all",
      page: 1,
      pageSize: 25,
    });
    expect(markup).toContain("Mostrando 1 de 37 clientes");
    expect(markup).toContain("Estado");
    expect(markup).toContain("Condición IVA");
    expect(markup).not.toContain("Con deuda");
    const englishMarkup = renderWithIntl(createElement(CustomersList), "en");
    expect(englishMarkup).toContain("Showing 1 of 37 customers");
    expect(englishMarkup).toContain("VAT status");
  });

  it("shows the server balance instead of the local movements and falls back to them without it", () => {
    const base = {
      address: "Calle 1",
      city: "Buenos Aires",
      companyId: "company-1",
      contactEmail: "",
      contactName: "",
      contactPhone: "",
      documentNumber: "20-12345678-6",
      documentType: "CUIT/CUIL",
      fiscalAddress: "Calle 1",
      legalName: "SRL",
      locality: "Centro",
      personType: "Jurídica",
      postalCode: "1000",
      priceList: "Minorista",
      province: "Buenos Aires",
      status: "active",
      vatCondition: "Responsable inscripto",
    } as const;
    const charge = {
      amountCents: asCents(100000),
      date: "2026-10-14",
      description: "Factura",
      id: "m1",
      type: "Factura",
    } as const;
    const withServer: Customer = {
      ...base,
      commercialName: "Con saldo API",
      id: "c1",
      movements: [charge],
      balanceCents: asCents(0),
    };
    const local: Customer = {
      ...base,
      commercialName: "Solo local",
      id: "c2",
      movements: [charge],
    };
    useCustomers.mockReturnValue({
      data: { items: [withServer, local], page: 1, pageSize: 25, total: 2 },
      error: null,
      isFetching: false,
      isLoading: false,
    });

    const markup = renderWithIntl(createElement(CustomersList));

    expect(markup.split("1.000,00")).toHaveLength(2);
  });

  it("publishes only the final term after the 300 ms search delay", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const cancelFirst = scheduleDebouncedValue("p", 300, publish);
    const cancelSecond = scheduleDebouncedValue("pe", 300, publish);
    cancelFirst();
    cancelSecond();
    scheduleDebouncedValue("perez", 300, publish);

    vi.advanceTimersByTime(299);
    expect(publish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith("perez");
    vi.useRealTimers();
  });
});
