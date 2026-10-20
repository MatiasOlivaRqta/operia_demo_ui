import { createElement, type EffectCallback } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/lib/money";
import type { DocumentItem, DocumentWithTotal } from "@/features/documents/types";

const { effectMock, documentQuery } = vi.hoisted(() => ({
  effectMock: vi.fn(),
  documentQuery: { data: undefined as DocumentWithTotal | undefined },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useEffect: effectMock };
});

vi.mock("@/data/queries", () => ({
  useCan: () => false,
  useDocument: () => documentQuery,
}));
vi.mock("@/components/features/documents/document-confirm-action", () => ({
  DocumentConfirmAction: () => null,
}));

import { useEffect } from "react";
import { DocumentDetail } from "@/components/features/documents/document-detail";
import { PrintableDocument } from "@/components/features/documents/printable-document";
import { renderWithIntl } from "@/test/render-with-intl";

const fixture: DocumentWithTotal = {
  companyId: "company-1",
  customerId: "customer-1",
  customerName: "Cliente",
  date: "2026-10-14",
  id: "document-1",
  internalNumber: "0001-00000012",
  items: [],
  pointOfSale: "0001",
  pendingCents: asCents(0),
  status: "COMPLETED",
  totalCents: asCents(0),
};

function createItem(discountRate: number, sku: string): DocumentItem {
  return {
    discountRate,
    productId: sku,
    productName: `Producto ${sku}`,
    quantity: 2,
    sku,
    taxRate: 21,
    unitPriceCents: asCents(100_000),
  };
}

afterEach(() => {
  documentQuery.data = undefined;
  vi.mocked(useEffect).mockReset();
  vi.unstubAllGlobals();
});

describe("PrintableDocument title", () => {
  it("sets the title while the document is mounted and restores it on cleanup", () => {
    documentQuery.data = fixture;
    vi.stubGlobal("document", { title: "Operia" });
    let cleanup: ReturnType<EffectCallback> = undefined;
    vi.mocked(useEffect).mockImplementation((effect) => {
      cleanup = effect();
    });

    renderWithIntl(createElement(PrintableDocument, { documentId: fixture.id }));

    expect(globalThis.document.title).toBe("0001-00000012");
    const cleanupCallback = cleanup as (() => void) | undefined;
    cleanupCallback?.();
    expect(globalThis.document.title).toBe("Operia");
  });

  it("shows the discount rate and line amount net of discount", () => {
    documentQuery.data = {
      ...fixture,
      items: [createItem(10, "SKU-10"), createItem(0, "SKU-0")],
    };

    const markup = renderWithIntl(createElement(PrintableDocument, { documentId: fixture.id }));

    expect(markup).toContain("Desc. %");
    expect(markup).toContain("10%");
    expect(markup).toContain("0%");
    expect(markup).toContain("$ 1.800,00");
    expect(markup).toContain("$ 2.000,00");
  });

  it("shows subtotal, discount, tax, and total for discounted and full price documents", () => {
    documentQuery.data = { ...fixture, items: [createItem(10, "SKU-10")] };
    const discountedMarkup = renderWithIntl(
      createElement(PrintableDocument, { documentId: fixture.id }),
    );

    expect(discountedMarkup).toContain("Subtotal");
    expect(discountedMarkup).toContain("$ 2.000,00");
    expect(discountedMarkup).toContain("Descuento");
    expect(discountedMarkup).toContain("-$ 200,00");
    expect(discountedMarkup).toContain("IVA");
    expect(discountedMarkup).toContain("$ 378,00");
    expect(discountedMarkup).toContain("Total");
    expect(discountedMarkup).toContain("$ 2.178,00");

    documentQuery.data = { ...fixture, items: [createItem(0, "SKU-0")] };
    const noDiscountMarkup = renderWithIntl(
      createElement(PrintableDocument, { documentId: fixture.id }),
    );

    expect(noDiscountMarkup).toContain("Descuento");
    expect(noDiscountMarkup).toContain("-$ 0,00");
    expect(noDiscountMarkup).toContain("$ 2.420,00");
  });

  it("renders the print view in English with localized labels and currency", () => {
    documentQuery.data = { ...fixture, items: [createItem(0, "SKU-0")] };
    const markup = renderWithIntl(
      createElement(PrintableDocument, { documentId: fixture.id }),
      "en",
    );

    expect(markup).toContain("Internal business receipt");
    expect(markup).toContain("Print or save PDF");
    expect(markup).toContain("Customer");
    expect(markup).toContain("ARS 2,420.00");
    expect(markup).not.toContain("Comprobante comercial interno");
  });

  it("shows the same summary amounts as the document detail and keeps the missing state", () => {
    documentQuery.data = { ...fixture, items: [createItem(10, "SKU-10")] };
    const printableMarkup = renderWithIntl(
      createElement(PrintableDocument, { documentId: fixture.id }),
    );
    const detailMarkup = renderWithIntl(createElement(DocumentDetail, { documentId: fixture.id }));

    for (const amount of ["$ 2.000,00", "-$ 200,00", "$ 378,00", "$ 2.178,00"]) {
      expect(printableMarkup).toContain(amount);
      expect(detailMarkup).toContain(amount);
    }

    documentQuery.data = undefined;
    const missingMarkup = renderWithIntl(
      createElement(PrintableDocument, { documentId: "missing-document" }),
    );
    expect(missingMarkup).toContain("No encontramos ese comprobante en la empresa activa.");
    expect(missingMarkup).toContain("Volver a comprobantes");
  });
});
