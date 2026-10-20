import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";
import DashboardError from "@/app/(dashboard)/error";
import DashboardLoading from "@/app/(dashboard)/loading";
import { CashLoading } from "@/components/features/cash/cash-loading";
import CustomersLoading from "@/app/(dashboard)/clientes/loading";
import DocumentsLoading from "@/app/(dashboard)/comprobantes/loading";
import InventoryLoading from "@/app/(dashboard)/inventario/loading";
import ProductsLoading from "@/app/(dashboard)/productos/loading";
import { renderWithIntl } from "@/test/render-with-intl";

describe("localized status screens", () => {
  it.each(["es", "en"] as const)("renders not-found and loading screens in %s", (locale) => {
    const notFound = renderWithIntl(createElement(NotFound), locale);
    const dashboardLoading = renderWithIntl(createElement(DashboardLoading), locale);
    const cashLoading = renderWithIntl(createElement(CashLoading), locale);
    const customersLoading = renderWithIntl(createElement(CustomersLoading), locale);
    const documentsLoading = renderWithIntl(createElement(DocumentsLoading), locale);
    const inventoryLoading = renderWithIntl(createElement(InventoryLoading), locale);
    const productsLoading = renderWithIntl(createElement(ProductsLoading), locale);
    expect(notFound).toContain(
      locale === "es" ? "No encontramos esta página" : "We couldn&#x27;t find this page",
    );
    expect(dashboardLoading).toContain(locale === "es" ? "Cargando página" : "Loading page");
    expect(cashLoading).toContain(locale === "es" ? "Cargando caja" : "Loading cash register");
    expect(customersLoading).toContain(locale === "es" ? "Cargando clientes" : "Loading customers");
    expect(documentsLoading).toContain(
      locale === "es" ? "Cargando comprobantes" : "Loading receipts",
    );
    expect(inventoryLoading).toContain(
      locale === "es" ? "Cargando inventario" : "Loading inventory",
    );
    expect(productsLoading).toContain(locale === "es" ? "Cargando productos" : "Loading products");
  });

  it.each(["es", "en"] as const)("renders the dashboard error in %s", (locale) => {
    const markup = renderWithIntl(
      createElement(DashboardError, { error: new Error("failed"), reset: vi.fn() }),
      locale,
    );
    expect(markup).toContain(
      locale === "es" ? "No pudimos cargar esta página" : "We couldn&#x27;t load this page",
    );
  });
});
