import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickActions } from "@/components/features/dashboard/quick-actions";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";
import { StockReview, shouldShowStockReview } from "@/components/features/dashboard/stock-review";
import { SummaryCards } from "@/components/features/dashboard/summary-cards";
import type { DashboardActivity } from "@/features/dashboard/types";
import type { DashboardSummary } from "@/features/dashboard/types";
import type { ProductSummary } from "@/features/products/types";
import type { Cents } from "@/lib/money";
import { renderWithIntl } from "@/test/render-with-intl";

const mocks = vi.hoisted(() => ({
  activity: vi.fn(),
  products: vi.fn(),
  summary: vi.fn(),
  can: vi.fn(),
}));

vi.mock("@/data/queries", () => ({
  useDashboardActivity: mocks.activity,
  useDashboardSummary: mocks.summary,
  useProducts: mocks.products,
  useCan: mocks.can,
}));

const emptySummary: DashboardSummary = {
  date: "2026-10-14",
  salesToday: { totalCents: 0 as Cents, count: 0, previousDayTotalCents: 0 as Cents },
  collectionsToday: { totalCents: 0 as Cents, count: 0 },
  receivables: { balanceCents: 0 as Cents, customersWithBalance: 0 },
  lowStockCount: 0,
};

const product: ProductSummary = {
  barcode: "",
  category: "Ferretería",
  categoryId: "cat-1",
  companyId: "company-1",
  costCents: 0 as Cents,
  id: "product-1",
  minimumStock: 4,
  name: "Taladro",
  priceCents: 0 as Cents,
  sku: "T-1",
  status: "active",
  unit: "unidad",
  stock: 2,
  lowStock: true,
};

function queryState<T>(data: T, isLoading = false, error: Error | null = null) {
  return { data, error, isLoading, isFetching: false, refetch: vi.fn() };
}

describe("dashboard summary cards", () => {
  beforeEach(() => {
    mocks.summary.mockReset();
  });

  it("renders loading and error states with retry", () => {
    mocks.summary.mockReturnValue(queryState(undefined, true));
    expect(renderWithIntl(<SummaryCards />)).toContain("Cargando el resumen");
    mocks.summary.mockReturnValue(queryState(undefined, false, new Error("offline")));
    const markup = renderWithIntl(<SummaryCards />);
    expect(markup).toContain("No se pudo cargar el resumen");
    expect(markup).toContain("Reintentar");
  });

  it("renders values, comparison and zero states", () => {
    mocks.summary.mockReturnValue(
      queryState({
        ...emptySummary,
        salesToday: {
          totalCents: 150_000 as Cents,
          count: 1,
          previousDayTotalCents: 100_000 as Cents,
        },
        collectionsToday: { totalCents: 85_000 as Cents, count: 3 },
        receivables: { balanceCents: 250_000 as Cents, customersWithBalance: 2 },
        lowStockCount: 4,
      }),
    );
    const markup = renderWithIntl(<SummaryCards />);
    expect(markup).toContain("$ 1.500,00");
    expect(markup).toContain("+50% vs. ayer");
    expect(markup).toContain("3 cobros");
    expect(markup).toContain("2 clientes con saldo");
    expect(markup).toContain("4 productos");

    mocks.summary.mockReturnValue(queryState(emptySummary));
    const zeros = renderWithIntl(<SummaryCards />);
    expect(zeros).toContain("$ 0,00");
    expect(zeros).toContain("Sin ventas ayer");
    expect(zeros).toContain("0 cobros");
    expect(zeros).toContain("0 clientes con saldo");
    expect(zeros).toContain("0 productos");
  });
});

describe("dashboard quick actions", () => {
  beforeEach(() => mocks.can.mockReturnValue(true));

  it("links to the requested routes", () => {
    const markup = renderWithIntl(<QuickActions />);
    expect(markup).toContain('href="/comprobantes/nuevo"');
    expect(markup).toContain('href="/caja?accion=cobro"');
    expect(markup).toContain('href="/inventario"');
    expect(markup).toContain("Nuevo comprobante");
    expect(markup).toContain("Registrar cobro");
    expect(markup).toContain("Ajustar stock");
  });

  it("filters quick actions by the permission of their destination", () => {
    mocks.can.mockImplementation((permission: string) => permission === "customers.read");
    const markup = renderWithIntl(<QuickActions />);
    expect(markup).not.toContain("Nuevo comprobante");
    expect(markup).not.toContain("Registrar cobro");
    expect(markup).not.toContain("Ajustar stock");
  });
});

describe("dashboard stock review", () => {
  const page = (items: ProductSummary[]) => ({ items, page: 1, pageSize: 3, total: items.length });

  it("shows low stock products and their movement links without the next-step label", () => {
    const state = queryState(page([product]));
    const markup = renderWithIntl(<StockReview products={state as never} />);
    expect(markup).toContain("Taladro");
    expect(markup).toContain("Stock: 2 unidades");
    expect(markup).toContain("Mínimo: 4 unidades");
    expect(markup).toContain('href="/productos/product-1?accion=movimiento"');
    expect(markup).toContain('href="/inventario"');
    expect(markup).not.toContain("Próximo paso");
  });

  it("is shown only when there are products to review or the query failed", () => {
    expect(shouldShowStockReview(queryState(page([product])) as never)).toBe(true);
    expect(shouldShowStockReview(queryState(page([])) as never)).toBe(false);
    expect(shouldShowStockReview(queryState(page([]), true) as never)).toBe(false);
    expect(shouldShowStockReview(queryState(page([]), false, new Error("offline")) as never)).toBe(
      true,
    );
  });

  it("renders the error state with retry", () => {
    const state = queryState(page([]), false, new Error("offline"));
    const markup = renderWithIntl(<StockReview products={state as never} />);
    expect(markup).toContain("No se pudieron cargar los productos");
    expect(markup).toContain("Reintentar");
  });
});

describe("recent activity", () => {
  beforeEach(() => mocks.activity.mockReset());

  it("renders document, collection and stock events with their links", () => {
    const value: DashboardActivity = {
      items: [
        {
          kind: "document",
          id: "d1",
          occurredAt: "2026-10-14T15:00:00.000Z",
          reference: "A-7",
          counterparty: "Cliente",
          amountCents: 150_000 as Cents,
          status: "COMPLETED",
          refId: "d1",
        },
        {
          kind: "collection",
          id: "c1",
          occurredAt: "2026-10-14T15:01:00.000Z",
          reference: "R-8",
          counterparty: "Cliente",
          amountCents: 50_000 as Cents,
          status: "COLLECTED",
          refId: "m1",
        },
        {
          kind: "stock_movement",
          id: "s1",
          occurredAt: "2026-10-14T15:02:00.000Z",
          reference: "M-9",
          counterparty: "Taladro",
          quantity: 2,
          status: "INGRESO",
          refId: "p1",
        },
      ],
    };
    mocks.activity.mockReturnValue(queryState(value));
    const markup = renderWithIntl(<RecentActivity />);
    expect(markup).toContain("Comprobante A-7");
    expect(markup).toContain("Cliente · $ 1.500,00");
    expect(markup).toContain('href="/comprobantes/d1"');
    expect(markup).toContain("Cobro R-8");
    expect(markup).toContain('href="/caja"');
    expect(markup).toContain("Movimiento de stock");
    expect(markup).toContain("Taladro · ingreso 2");
    expect(markup).toContain('href="/productos/p1"');
    expect(markup).toContain("Completado");
    expect(markup).toContain("Cobrado");
    expect(markup).toContain("Ingreso");
  });

  it("renders empty, loading and error states", () => {
    mocks.activity.mockReturnValue(queryState({ items: [] }));
    expect(renderWithIntl(<RecentActivity />)).toContain("Todavía no hay actividad.");
    mocks.activity.mockReturnValue(queryState(undefined, true));
    expect(renderWithIntl(<RecentActivity />)).toContain("Cargando actividad");
    mocks.activity.mockReturnValue(queryState(undefined, false, new Error("offline")));
    const markup = renderWithIntl(<RecentActivity />);
    expect(markup).toContain("No se pudo cargar la actividad");
    expect(markup).toContain("Reintentar");
  });
});

describe("dashboard English", () => {
  it("renders dashboard actions and summary in English", () => {
    mocks.can.mockReturnValue(true);
    mocks.summary.mockReturnValue(queryState(emptySummary));
    const markup = renderWithIntl(<SummaryCards />, "en");
    expect(markup).toContain("No sales yesterday");
    expect(markup).toContain("No sales yesterday");
    expect(renderWithIntl(<QuickActions />, "en")).toContain("New receipt");
  });
});
