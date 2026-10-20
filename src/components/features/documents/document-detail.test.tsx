import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentDetail } from "@/components/features/documents/document-detail";
import type { DocumentStatus } from "@/features/documents/types";
import { renderWithIntl } from "@/test/render-with-intl";

const mocks = vi.hoisted(() => ({ can: vi.fn(), document: null as unknown }));
vi.mock("@/data/queries", () => ({
  useCan: mocks.can,
  useDocument: () => ({ data: mocks.document }),
  useDocumentCollections: () => ({ isLoading: true }),
}));
vi.mock("@/data/mutations", () => ({ useDocumentMutations: () => ({ cancel: vi.fn() }) }));

const makeDocument = (status: DocumentStatus) => ({
  companyId: "company-1",
  customerId: "customer-1",
  customerName: "Ferretería Norte",
  date: "2026-08-26",
  id: "document-1",
  internalNumber: "0001-00000001",
  items: [
    {
      discountRate: 0,
      productId: "product-1",
      productName: "Taladro",
      quantity: 1,
      sku: "TAL-1",
      taxRate: 21,
      unitPriceCents: 10000,
    },
  ],
  pointOfSale: "0001",
  pendingCents: 4250,
  status,
});

describe("DocumentDetail cancellation action", () => {
  beforeEach(() => {
    mocks.can.mockReturnValue(true);
  });

  it.each([
    ["es", "PENDING", "Pendiente", "Anular comprobante"],
    ["es", "PARTIAL", "Parcial", "Anular comprobante"],
    ["es", "COMPLETED", "Completado", "Anular comprobante"],
    ["en", "PENDING", "Pending", "Void receipt"],
    ["en", "PARTIAL", "Partial", "Void receipt"],
    ["en", "COMPLETED", "Completed", "Void receipt"],
  ] as const)("shows the cancellation action only for %s %s", (locale, status, label, action) => {
    mocks.document = makeDocument(status);
    const markup = renderWithIntl(<DocumentDetail documentId="document-1" />, locale);
    expect(markup).toContain(label);
    if (status === "PENDING") expect(markup).toContain(action);
    else expect(markup).not.toContain(action);
  });
});

describe("DocumentDetail remaining balance", () => {
  it.each([
    ["es", "PARTIAL", "Falta cobrar $ 42,50"],
    ["en", "PARTIAL", "Remaining to collect ARS 42.50"],
  ] as const)("shows the remaining amount in %s for %s", (locale, status, label) => {
    mocks.document = makeDocument(status);
    expect(renderWithIntl(<DocumentDetail documentId="document-1" />, locale)).toContain(label);
  });

  it.each([
    ["es", "PENDING"],
    ["es", "COMPLETED"],
    ["es", "CANCELLED"],
    ["en", "PENDING"],
    ["en", "COMPLETED"],
    ["en", "CANCELLED"],
  ] as const)("does not show a remaining amount in %s for %s", (locale, status) => {
    mocks.document = makeDocument(status);
    const markup = renderWithIntl(<DocumentDetail documentId="document-1" />, locale);
    expect(markup).not.toContain("Falta cobrar");
    expect(markup).not.toContain("Remaining to collect");
  });
});

describe("DocumentDetail collection card", () => {
  beforeEach(() => {
    mocks.can.mockReturnValue(true);
  });

  it.each([
    ["es", "Cobros imputados"],
    ["en", "Applied collections"],
  ] as const)("shows the card in %s", (locale, title) => {
    mocks.document = makeDocument("COMPLETED");
    expect(renderWithIntl(<DocumentDetail documentId="document-1" />, locale)).toContain(title);
  });

  it.each(["es", "en"] as const)("hides the card for cancelled receipts in %s", (locale) => {
    mocks.document = makeDocument("CANCELLED");
    expect(renderWithIntl(<DocumentDetail documentId="document-1" />, locale)).not.toContain(
      locale === "es" ? "Cobros imputados" : "Applied collections",
    );
  });
});
