"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { DocumentStatusBadge } from "@/components/features/documents/document-status";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/common/list-pagination";
import { totalPages } from "@/components/common/list-pagination-logic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCan, useDocuments } from "@/data/queries";
import type { DocumentSummary } from "@/features/documents/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useFormatters } from "@/lib/use-formatters";
import { DocumentCollections } from "@/components/features/documents/collection-relations";

const DocumentRow = memo(function DocumentRow({ document }: { document: DocumentSummary }) {
  const canReadCollections = useCan("documents.read", "account.read");
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("documents.list");
  const { currency: formatCurrency, date: formatDate } = useFormatters();
  const detailsId = `document-collections-${document.id}`;
  return (
    <>
      <TableRow className="group">
        <TableCell className="px-5">
          <Link
            href={`/comprobantes/${document.id}`}
            className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-mono text-sm font-medium text-slate-800">
                PV {document.internalNumber}
              </span>
              <span className="mt-1 block text-xs text-slate-500 sm:hidden">
                {formatDate(document.date)}
              </span>
            </span>
          </Link>
        </TableCell>
        <TableCell className="hidden text-slate-600 sm:table-cell">
          {formatDate(document.date)}
        </TableCell>
        <TableCell className="font-medium text-slate-700">{document.customerName}</TableCell>
        <TableCell className="text-right font-medium text-slate-800">
          {formatCurrency(document.totalCents)}
        </TableCell>
        <TableCell>
          <DocumentStatusBadge status={document.status} />
        </TableCell>
        {canReadCollections && (
          <TableCell className="w-12 px-2">
            {document.status !== "CANCELLED" && (
              <button
                type="button"
                aria-label={expanded ? t("hideCollections") : t("viewCollections")}
                aria-expanded={expanded}
                aria-controls={detailsId}
                onClick={() => setExpanded((value) => !value)}
                className="rounded p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                {expanded ? (
                  <ChevronDown className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-4" aria-hidden="true" />
                )}
              </button>
            )}
          </TableCell>
        )}
      </TableRow>
      {canReadCollections && document.status !== "CANCELLED" && (
        <TableRow id={detailsId} hidden={!expanded}>
          <TableCell colSpan={6} className="bg-slate-50 px-5 py-4">
            <DocumentCollections documentId={document.id} open={expanded} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

export function DocumentsList() {
  const canWriteDocuments = useCan("documents.write");
  const canReadCollections = useCan("documents.read", "account.read");
  const t = useTranslations("documents.list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const documentsQuery = useDocuments({ search: debouncedSearch, status, page, pageSize });
  const { items, total } = documentsQuery.data;

  useEffect(() => {
    if (page > totalPages(total, pageSize)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the active query on the last valid offset after server totals shrink.
      setPage(totalPages(total, pageSize));
    }
  }, [page, pageSize, total]);
  const changePage = useCallback((value: number) => setPage(value), []);
  const changePageSize = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);
  const hasFilters = Boolean(debouncedSearch.trim()) || status !== "all";

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <span>{t("operation")}</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-slate-800">{t("title")}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{t("description")}</p>
        </div>
        {canWriteDocuments && (
          <Link
            href="/comprobantes/nuevo"
            className="bg-sidebar hover:bg-sidebar-accent inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Link>
        )}
      </div>
      <section
        className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
        aria-busy={documentsQuery.isFetching}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label={t("search")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-9 border-slate-200 bg-slate-50 pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            {t("status")}
            <select
              aria-label={t("filterStatus")}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("all")}</option>
              <option value="PENDING">{t("pending")}</option>
              <option value="PARTIAL">{t("partial")}</option>
              <option value="COMPLETED">{t("completed")}</option>
              <option value="CANCELLED">{t("cancelled")}</option>
            </select>
          </label>
        </div>
        <Table aria-label={t("tableLabel")}>
          <TableHeader className="bg-slate-50/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5 text-xs text-slate-500">{t("receipt")}</TableHead>
              <TableHead className="hidden text-xs text-slate-500 sm:table-cell">
                {t("date")}
              </TableHead>
              <TableHead className="text-xs text-slate-500">{t("customer")}</TableHead>
              <TableHead className="text-right text-xs text-slate-500">{t("total")}</TableHead>
              <TableHead className="text-xs text-slate-500">{t("status")}</TableHead>
              {canReadCollections && <TableHead aria-label={t("viewCollections")} />}
            </TableRow>
          </TableHeader>
          <TableBody
            className={
              documentsQuery.isFetching && !documentsQuery.isLoading
                ? "opacity-60 transition-opacity"
                : undefined
            }
          >
            {documentsQuery.isLoading ? (
              Array.from({ length: pageSize }, (_, index) => (
                <TableRow key={index} className="h-[65px]">
                  <TableCell colSpan={canReadCollections ? 6 : 5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : documentsQuery.error ? (
              <TableRow>
                <TableCell colSpan={canReadCollections ? 6 : 5}>
                  <p role="alert" className="py-4 text-center text-sm text-rose-700">
                    {t("loadError")}
                  </p>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canReadCollections ? 6 : 5}>
                  <p role="status" className="py-4 text-center text-sm text-slate-500">
                    {hasFilters ? t("filteredEmpty") : t("empty")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((document) => <DocumentRow key={document.id} document={document} />)
            )}
          </TableBody>
        </Table>
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={documentsQuery.isFetching}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      </section>
    </main>
  );
}
