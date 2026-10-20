"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Ellipsis, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCan, useInventorySummary, useProducts } from "@/data/queries";
import type { ProductSummary } from "@/features/products/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useFormatters } from "@/lib/use-formatters";
import { useTranslations } from "next-intl";

const ProductRow = memo(function ProductRow({ product }: { product: ProductSummary }) {
  const t = useTranslations("products.list");
  const {
    currency: formatCurrency,
    quantity: formatQuantity,
    number: formatNumber,
  } = useFormatters();
  return (
    <TableRow className="group">
      <TableCell className="px-5 py-3">
        <Link
          href={`/productos/${product.id}`}
          className="block outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <p className="font-medium text-slate-800 group-hover:text-emerald-800">{product.name}</p>
          <p className="mt-1 text-xs text-slate-500 md:hidden">{product.sku}</p>
        </Link>
      </TableCell>
      <TableCell className="hidden font-mono text-xs text-slate-600 md:table-cell">
        {product.sku}
      </TableCell>
      <TableCell className="hidden text-slate-700 lg:table-cell">
        {formatCurrency(product.priceCents)}
      </TableCell>
      <TableCell className="hidden text-slate-600 lg:table-cell">
        {formatCurrency(product.costCents)}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={
            product.lowStock ? "font-semibold text-amber-700" : "font-medium text-slate-800"
          }
        >
          {formatQuantity(product.stock, product.unit)}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          {t("minimum", { count: formatNumber(product.minimumStock) })}
        </span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge
          className={
            product.lowStock
              ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          }
        >
          {product.lowStock ? t("lowStock") : t("normal")}
        </Badge>
      </TableCell>
      <TableCell className="pr-4">
        <Link
          href={`/productos/${product.id}`}
          className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <Ellipsis className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("view", { name: product.name })}</span>
        </Link>
      </TableCell>
    </TableRow>
  );
});

type ProductsListProps = Readonly<{ initialLowStock?: boolean }>;

export function ProductsList({ initialLowStock = false }: ProductsListProps) {
  const canWriteProducts = useCan("products.write");
  const t = useTranslations("products.list");
  const { lowStockCount: formatLowStockCount } = useFormatters();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("all");
  const [lowStock, setLowStock] = useState(initialLowStock);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const inventoryQuery = useInventorySummary();
  const productsQuery = useProducts({ search: debouncedSearch, status, lowStock, page, pageSize });
  const { items, total } = productsQuery.data;
  const boundedPage = Math.min(page, totalPages(total, pageSize));
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
  const hasFilters = Boolean(debouncedSearch.trim()) || status !== "all" || lowStock;

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
        {canWriteProducts && (
          <Link
            href="/productos/nuevo"
            className="bg-sidebar hover:bg-sidebar-accent inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Link>
        )}
      </div>
      <section
        className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
        aria-busy={productsQuery.isFetching}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label={t("searchLabel")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-slate-700 placeholder:text-slate-600"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
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
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={lowStock}
                onCheckedChange={(checked) => {
                  setLowStock(checked === true);
                  setPage(1);
                }}
              />
              {t("lowStock")}
            </label>
            <p className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {formatLowStockCount(inventoryQuery.data.lowStockCount)}
            </p>
          </div>
        </div>
        <Table aria-label={t("productTableLabel")}>
          <TableHeader className="bg-slate-50/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5 text-xs font-semibold text-slate-500">
                {t("product")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 md:table-cell">
                {t("code")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 lg:table-cell">
                {t("salePrice")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 lg:table-cell">
                {t("cost")}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-500">
                {t("available")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 sm:table-cell">
                {t("status")}
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody
            className={
              productsQuery.isFetching && !productsQuery.isLoading
                ? "opacity-60 transition-opacity"
                : undefined
            }
          >
            {productsQuery.isLoading ? (
              Array.from({ length: pageSize }, (_, index) => (
                <TableRow key={index} className="h-[65px]">
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : productsQuery.error ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <p role="alert" className="py-4 text-center text-sm text-rose-700">
                    {t("loadError")}
                  </p>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <p className="py-4 text-center text-sm text-slate-500" role="status">
                    {hasFilters ? t("emptyFiltered") : t("empty")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((product) => <ProductRow key={product.id} product={product} />)
            )}
          </TableBody>
        </Table>
        <ListPagination
          page={boundedPage}
          pageSize={pageSize}
          total={total}
          disabled={productsQuery.isFetching}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      </section>
    </main>
  );
}
