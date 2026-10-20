import { describe, expect, it } from "vitest";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toCents } from "@/lib/money";
import { renderWithIntl } from "@/test/render-with-intl";
import { useFormatters } from "@/lib/use-formatters";
import { createElement } from "react";

describe("localized number and currency formatting", () => {
  it("formats pesos with the active locale while keeping Argentina time", () => {
    const amount = toCents(1_234_567.5);
    expect(formatCurrency(amount, "es")).toContain("1.234.567,50");
    expect(formatCurrency(amount, "es")).toContain("$");
    expect(formatCurrency(amount, "en")).toContain("1,234,567.50");
    expect(formatCurrency(amount, "en")).toContain("ARS");
    expect(formatDateTime("2026-10-14T03:30:00.000Z", "es")).toContain("12:30 a. m.");
    expect(formatDateTime("2026-10-14T03:30:00.000Z", "en")).toContain("12:30 AM");
  });

  it("uses catalog ICU plurals for units and low-stock counts in both locales", () => {
    function Examples() {
      const f = useFormatters();
      return createElement(
        "p",
        null,
        `${f.quantity(1, "Unidad")}|${f.quantity(2, "Unidad")}|${f.lowStockCount(1)}|${f.lowStockCount(2)}`,
      );
    }
    expect(renderWithIntl(createElement(Examples))).toContain(
      "1 unidad|2 unidades|1 producto requiere atención|2 productos requieren atención",
    );
    expect(renderWithIntl(createElement(Examples), "en")).toContain(
      "1 unit|2 units|1 product needs attention|2 products need attention",
    );
  });
});
