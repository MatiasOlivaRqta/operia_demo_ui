import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentsList } from "@/components/features/documents/documents-list";
import { renderWithIntl } from "@/test/render-with-intl";

const mocks = vi.hoisted(() => ({ can: vi.fn(), documents: vi.fn(), collections: vi.fn() }));
vi.mock("@/data/queries", () => ({
  useCan: mocks.can,
  useDocuments: mocks.documents,
  useDocumentCollections: mocks.collections,
}));

describe("documents status filter", () => {
  beforeEach(() => {
    mocks.can.mockReturnValue(false);
    mocks.documents.mockReturnValue({ data: { items: [], total: 0 }, isFetching: false });
    mocks.collections.mockReturnValue({ isLoading: true });
  });

  it.each([
    ["es", ["Pendiente", "Parcial", "Completado", "Anulado"]],
    ["en", ["Pending", "Partial", "Completed", "Voided"]],
  ] as const)("renders all server filter options in %s", (locale, labels) => {
    const markup = renderWithIntl(<DocumentsList />, locale);
    for (const status of ["PENDING", "PARTIAL", "COMPLETED", "CANCELLED"])
      expect(markup).toContain(`value="${status}"`);
    for (const label of labels) expect(markup).toContain(label);
  });

  it.each([
    ["es", "Ver cobros"],
    ["en", "View collections"],
  ] as const)("renders the collapsed collection action in %s", (locale, label) => {
    mocks.can.mockImplementation((...permissions: string[]) =>
      permissions.includes("documents.read"),
    );
    mocks.documents.mockReturnValue({
      data: {
        items: [
          {
            customerName: "Distribuidora Norte",
            date: "2026-08-25",
            id: "document-1",
            internalNumber: "0001-00002457",
            status: "PARTIAL",
            totalCents: 10000,
          },
        ],
        total: 1,
      },
      isFetching: false,
    });
    const markup = renderWithIntl(<DocumentsList />, locale);
    expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain('aria-expanded="false"');
  });

  it.each(["es", "en"] as const)(
    "hides collection actions without read permission in %s",
    (locale) => {
      mocks.can.mockReturnValue(false);
      mocks.documents.mockReturnValue({
        data: {
          items: [
            {
              customerName: "Distribuidora Norte",
              date: "2026-08-25",
              id: "document-1",
              internalNumber: "0001-00002457",
              status: "PARTIAL",
              totalCents: 10000,
            },
          ],
          total: 1,
        },
        isFetching: false,
      });
      const markup = renderWithIntl(<DocumentsList />, locale);
      expect(markup).not.toContain(
        `aria-label="${locale === "es" ? "Ver cobros" : "View collections"}"`,
      );
    },
  );
});
