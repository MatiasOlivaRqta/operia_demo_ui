"use client";

import {
  ArrowLeft,
  CircleCheck,
  FileDown,
  FileText,
  Printer,
  RotateCcw,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { DocumentStatusBadge } from "@/components/features/documents/document-status";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentConfirmAction } from "@/components/features/documents/document-confirm-action";
import {
  calculateDocumentDiscount,
  calculateDocumentSubtotal,
  calculateDocumentTax,
  calculateDocumentTotal,
  calculateItemSubtotal,
} from "@/features/documents/domain";
import { useFormatters } from "@/lib/use-formatters";
import type { DocumentItem } from "@/features/documents/types";
import { useCan, useDocument } from "@/data/queries";
import { DocumentCollections } from "@/components/features/documents/collection-relations";

type DocumentDetailProps = { documentId: string };

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const t = useTranslations("documents.detail");
  const { currency: formatCurrency, date: formatDate, number: formatNumber } = useFormatters();
  const documentQuery = useDocument(documentId);
  const canReadCollections = useCan("documents.read", "account.read");
  const document = documentQuery.data;
  if (!document)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{t("notFound")}</h1>
        <Link href="/comprobantes" className="mt-4 inline-block text-emerald-800 underline">
          {t("back")}
        </Link>
      </main>
    );
  const isCancelled = document.status === "CANCELLED";
  const subtotal = calculateDocumentSubtotal(document.items);
  const discount = calculateDocumentDiscount(document.items);
  const tax = calculateDocumentTax(document.items);
  const total = calculateDocumentTotal(document.items);
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href="/comprobantes"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              PV {document.internalNumber}
            </h1>
            <DocumentStatusBadge status={document.status} />
            {document.status === "PARTIAL" && (
              <span className="text-sm font-medium text-sky-800">
                {t("remainingToCollect", { amount: formatCurrency(document.pendingCents) })}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {document.customerName} · {formatDate(document.date)} ·{" "}
            {t("pointOfSale", { number: document.pointOfSale })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/comprobantes/${document.id}/imprimir`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Printer className="size-3.5" aria-hidden="true" />
            {t("print")}
          </Link>
          <Link
            href={`/comprobantes/${document.id}/imprimir`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <FileDown className="size-3.5" aria-hidden="true" />
            PDF
          </Link>
          {document.status === "PENDING" && (
            <DocumentConfirmAction
              documentId={document.id}
              documentNumber={`PV ${document.internalNumber}`}
              documentStatus={document.status}
              mode="cancel"
            />
          )}
        </div>
      </div>
      {isCancelled && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
          {t("voidedBy", { name: document.cancelledBy ?? "" })}
        </div>
      )}
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">{t("title")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
            </div>
            <Table aria-label={t("lines", { number: document.internalNumber })}>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 text-xs text-slate-500">{t("product")}</TableHead>
                  <TableHead className="text-right text-xs text-slate-500">
                    {t("quantityShort")}
                  </TableHead>
                  <TableHead className="hidden text-right text-xs text-slate-500 sm:table-cell">
                    {t("price")}
                  </TableHead>
                  <TableHead className="hidden text-right text-xs text-slate-500 md:table-cell">
                    {t("discountShort")}
                  </TableHead>
                  <TableHead className="text-right text-xs text-slate-500">{t("total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.items.map((item: DocumentItem) => (
                  <TableRow key={item.sku}>
                    <TableCell className="px-5">
                      <p className="font-medium text-slate-800">{item.productName}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {item.sku} · IVA {item.taxRate}%
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {formatNumber(item.quantity)}
                    </TableCell>
                    <TableCell className="hidden text-right text-slate-700 sm:table-cell">
                      {formatCurrency(item.unitPriceCents)}
                    </TableCell>
                    <TableCell className="hidden text-right text-slate-600 md:table-cell">
                      {item.discountRate}%
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-800">
                      {formatCurrency(calculateItemSubtotal(item))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="ml-auto grid w-full max-w-sm gap-2 border-t border-slate-100 p-5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t("discount")}</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t("tax")}</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
                <span>{t("total")}</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {canReadCollections && !isCancelled && (
            <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
              <CardContent className="p-6">
                <h2 className="mb-4 font-semibold text-slate-900">{t("collections")}</h2>
                <DocumentCollections documentId={document.id} open />
              </CardContent>
            </Card>
          )}
          <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
            <CardContent className="p-6">
              <h2 className="font-semibold text-slate-900">{t("effects")}</h2>
              <div className="mt-5 space-y-4 text-sm">
                <p className="flex items-center gap-3 text-slate-600">
                  <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <CircleCheck className="size-4" aria-hidden="true" />
                  </span>
                  {t("accountMovement")}
                </p>
                <p className="flex items-center gap-3 text-slate-600">
                  <span className="grid size-8 place-items-center rounded-full bg-sky-50 text-sky-700">
                    <Warehouse className="size-4" aria-hidden="true" />
                  </span>
                  {!isCancelled ? t("stockRecorded") : t("stockReversed")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar border border-slate-200/80 py-0 text-white shadow-sm ring-0">
            <CardContent className="p-6">
              <FileText className="size-5 text-emerald-300" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">{t("numbering")}</h2>
              <p className="text-sidebar-muted mt-2 text-sm leading-6">
                {t("numberingDescription", { pointOfSale: document.pointOfSale })}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
