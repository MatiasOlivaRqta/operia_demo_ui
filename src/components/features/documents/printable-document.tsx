"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/features/documents/document-status";
import {
  calculateDocumentDiscount,
  calculateDocumentSubtotal,
  calculateDocumentTax,
  calculateDocumentTotal,
  calculateItemDiscount,
  calculateItemSubtotal,
} from "@/features/documents/domain";
import { useFormatters } from "@/lib/use-formatters";
import type { DocumentItem } from "@/features/documents/types";
import { useDocument } from "@/data/queries";
import { asCents } from "@/lib/money";

type PrintableDocumentProps = { documentId: string };

export function PrintableDocument({ documentId }: PrintableDocumentProps) {
  const t = useTranslations("documents.print");
  const detailT = useTranslations("documents.detail");
  const { currency: formatCurrency, date: formatDate, number: formatNumber } = useFormatters();
  const documentQuery = useDocument(documentId);
  const document = documentQuery.data;
  const internalNumber = document?.internalNumber;
  useEffect(() => {
    if (!internalNumber) return;

    const previousTitle = globalThis.document.title;
    globalThis.document.title = `${internalNumber}`;
    return () => {
      globalThis.document.title = previousTitle;
    };
  }, [internalNumber]);

  if (!document)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{detailT("notFound")}</h1>
        <Link href="/comprobantes" className="mt-4 inline-block text-emerald-800 underline">
          {detailT("back")}
        </Link>
      </main>
    );
  const subtotal = calculateDocumentSubtotal(document.items);
  const discount = calculateDocumentDiscount(document.items);
  const tax = calculateDocumentTax(document.items);
  const total = calculateDocumentTotal(document.items);
  function printDocument(): void {
    window.print();
  }
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="min-h-dvh bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0"
    >
      <div className="mx-auto mb-5 flex max-w-3xl justify-between print:hidden">
        <Link
          href={`/comprobantes/${document.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <Button
          type="button"
          className="bg-sidebar hover:bg-sidebar-accent text-white"
          onClick={printDocument}
        >
          <Printer className="size-4" aria-hidden="true" />
          {t("print")}
        </Button>
      </div>
      <article className="mx-auto max-w-3xl bg-white p-8 text-slate-900 shadow-sm sm:p-12 print:max-w-none print:shadow-none">
        <header className="flex justify-between border-b-2 border-slate-900 pb-8">
          <div>
            <p className="text-2xl font-semibold tracking-tight">Operia</p>
            <p className="mt-2 text-sm text-slate-500">{t("title")}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold">PV {document.internalNumber}</p>
            <p className="mt-2 text-sm text-slate-500">{formatDate(document.date)}</p>
            <p className="mt-1 text-xs text-slate-600">
              {t("pointOfSale", { number: document.pointOfSale })}
            </p>
          </div>
        </header>
        <section className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {t("customer")}
            </p>
            <p className="mt-2 font-medium">{document.customerName}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {t("status")}
            </p>
            <div className="mt-2">
              <DocumentStatusBadge status={document.status} />
            </div>
          </div>
        </section>
        <div
          role="region"
          tabIndex={0}
          aria-label={t("region")}
          className="focus-visible:outline-ring mt-10 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 print:overflow-visible"
        >
          <table
            aria-label={t("table", { number: document.internalNumber })}
            className="w-full text-sm"
          >
            <caption className="sr-only">
              {t("caption", { number: document.internalNumber })}
            </caption>
            <thead className="border-y border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th scope="col" className="py-3 font-medium">
                  {t("product")}
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  {t("quantity")}
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  {t("price")}
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  {t("discount")}
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  {t("total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {document.items.map((item: DocumentItem) => (
                <tr key={item.sku} className="border-b border-slate-100">
                  <td className="py-4">
                    <p className="font-medium">{item.productName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {item.sku} · IVA {item.taxRate}%
                    </p>
                  </td>
                  <td className="py-4 text-right">{formatNumber(item.quantity)}</td>
                  <td className="py-4 text-right">{formatCurrency(item.unitPriceCents)}</td>
                  <td className="py-4 text-right">{item.discountRate}%</td>
                  <td className="py-4 text-right font-medium">
                    {formatCurrency(
                      asCents(calculateItemSubtotal(item) - calculateItemDiscount(item)),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="print-totals mt-8 ml-auto grid max-w-xs gap-2 border-t-2 border-slate-900 pt-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{t("subtotal")}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t("discountTotal")}</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t("tax")}</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
            <span>{t("total")}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <footer className="mt-16 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-600">
          {t("footer")}
        </footer>
      </article>
    </main>
  );
}
