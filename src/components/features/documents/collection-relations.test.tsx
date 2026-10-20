import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollectionApplications,
  DocumentCollections,
} from "@/components/features/documents/collection-relations";
import { useCollectionApplications, useDocumentCollections } from "@/data/queries";
import { renderWithIntl } from "@/test/render-with-intl";
import { asCents } from "@/lib/money";
import { formatCurrency } from "@/lib/format";

vi.mock("@/data/queries", () => ({
  useCollectionApplications: vi.fn(),
  useDocumentCollections: vi.fn(),
}));

const methods = {
  es: { title: "Cobros imputados", empty: "Todavía no tiene cobros", paid: "Cobrado" },
  en: { title: "Applied collections", empty: "There are no collections yet", paid: "Paid" },
} as const;

describe("collection relation components", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["es", "en"] as const)(
    "renders document collection loading, empty, data, and error in %s",
    (locale) => {
      vi.mocked(useDocumentCollections).mockReturnValue({
        data: {
          items: [],
          totalCents: asCents(0),
          paidCents: asCents(0),
          pendingCents: asCents(0),
        },
        error: null,
        isLoading: true,
        isFetching: true,
        isError: false,
      });
      expect(renderWithIntl(<DocumentCollections documentId="doc-1" open />, locale)).toContain(
        locale === "es" ? "Cargando detalle" : "Loading details",
      );

      vi.mocked(useDocumentCollections).mockReturnValue({
        data: {
          items: [],
          totalCents: asCents(10000),
          paidCents: asCents(0),
          pendingCents: asCents(10000),
        },
        error: null,
        isLoading: false,
        isFetching: false,
        isError: false,
      });
      let markup = renderWithIntl(<DocumentCollections documentId="doc-1" open />, locale);
      expect(markup).toContain(methods[locale].title);
      expect(markup).toContain(methods[locale].empty);

      vi.mocked(useDocumentCollections).mockReturnValue({
        data: {
          items: [
            {
              kind: "PAYMENT",
              occurredAt: "2026-10-10T12:00:00.000Z",
              amountCents: asCents(2500),
              paymentMethod: "TRANSFER",
              receiptNumber: "R-10",
              cashMovementId: "movement-1",
            },
            {
              kind: "CREDIT_APPLIED",
              occurredAt: "2026-10-11T12:00:00.000Z",
              amountCents: asCents(500),
              paymentMethod: null,
              receiptNumber: null,
              cashMovementId: null,
            },
          ],
          totalCents: asCents(12000),
          paidCents: asCents(4000),
          pendingCents: asCents(8000),
        },
        error: null,
        isLoading: false,
        isFetching: false,
        isError: false,
      });
      markup = renderWithIntl(<DocumentCollections documentId="doc-1" open />, locale);
      expect(markup).toContain("R-10");
      expect(markup).toContain(locale === "es" ? "Transferencia" : "Transfer");
      expect(markup).toContain(locale === "es" ? "Saldo a favor aplicado" : "Credit applied");
      expect(markup).toContain("Total");
      expect(markup).toContain(methods[locale].paid);
      expect(markup).toContain(locale === "es" ? "Pendiente" : "Pending");
      expect(markup).toContain(formatCurrency(asCents(12000), locale));
      expect(markup).toContain(formatCurrency(asCents(4000), locale));
      expect(markup).toContain(formatCurrency(asCents(8000), locale));

      vi.mocked(useDocumentCollections).mockReturnValue({
        data: {
          items: [],
          totalCents: asCents(0),
          paidCents: asCents(0),
          pendingCents: asCents(0),
        },
        error: new Error("failure") as never,
        isLoading: false,
        isFetching: false,
        isError: true,
      });
      expect(renderWithIntl(<DocumentCollections documentId="doc-1" open />, locale)).toContain(
        locale === "es" ? "No se pudo cargar el detalle." : "Could not load the details.",
      );
    },
  );

  it.each(["es", "en"] as const)(
    "renders collection application loading, empty, data, and error in %s",
    (locale) => {
      vi.mocked(useCollectionApplications).mockReturnValue({
        data: {
          cashMovementId: "movement-1",
          receiptNumber: null,
          paymentMethod: "CASH",
          occurredAt: "2026-10-10T12:00:00.000Z",
          totalCents: asCents(0),
          documents: [],
          creditGeneratedCents: asCents(0),
        },
        error: null,
        isLoading: true,
        isFetching: true,
        isError: false,
      });
      expect(
        renderWithIntl(<CollectionApplications customerId="c1" cashMovementId="m1" open />, locale),
      ).toContain(locale === "es" ? "Cargando detalle" : "Loading details");

      vi.mocked(useCollectionApplications).mockReturnValue({
        data: {
          cashMovementId: "movement-1",
          receiptNumber: null,
          paymentMethod: "CASH",
          occurredAt: "2026-10-10T12:00:00.000Z",
          totalCents: asCents(0),
          documents: [],
          creditGeneratedCents: asCents(0),
        },
        error: null,
        isLoading: false,
        isFetching: false,
        isError: false,
      });
      let markup = renderWithIntl(
        <CollectionApplications customerId="c1" cashMovementId="m1" open />,
        locale,
      );
      expect(markup).toContain(
        locale === "es" ? "no cubrió comprobantes" : "did not cover any receipts",
      );

      vi.mocked(useCollectionApplications).mockReturnValue({
        data: {
          cashMovementId: "movement-1",
          receiptNumber: "R-22",
          paymentMethod: "CASH",
          occurredAt: "2026-10-10T12:00:00.000Z",
          totalCents: asCents(5000),
          documents: [
            {
              documentId: "doc/1",
              documentNumber: "0001-00000001",
              amountCents: asCents(4000),
              status: "PARTIAL",
            },
          ],
          creditGeneratedCents: asCents(1000),
        },
        error: null,
        isLoading: false,
        isFetching: false,
        isError: false,
      });
      markup = renderWithIntl(
        <CollectionApplications customerId="c1" cashMovementId="m1" open />,
        locale,
      );
      expect(markup).toContain("0001-00000001");
      expect(markup).toContain("/comprobantes/doc%2F1");
      expect(markup).toContain(locale === "es" ? "Parcial" : "Partial");
      expect(markup).toContain(locale === "es" ? "Excedente a favor" : "Credit excess");

      vi.mocked(useCollectionApplications).mockReturnValue({
        data: {
          cashMovementId: "movement-1",
          receiptNumber: null,
          paymentMethod: "CASH",
          occurredAt: "2026-10-10T12:00:00.000Z",
          totalCents: asCents(0),
          documents: [],
          creditGeneratedCents: asCents(0),
        },
        error: new Error("failure") as never,
        isLoading: false,
        isFetching: false,
        isError: true,
      });
      expect(
        renderWithIntl(<CollectionApplications customerId="c1" cashMovementId="m1" open />, locale),
      ).toContain(
        locale === "es" ? "No se pudo cargar el detalle." : "Could not load the details.",
      );
    },
  );
});
