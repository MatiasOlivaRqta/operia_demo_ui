"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleAlert,
  Filter,
  PackageCheck,
  X,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { ListPagination } from "@/components/common/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductPicker } from "@/components/features/documents/product-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductSummary, StockMovementType } from "@/features/products/types";
import {
  activeInventoryMovementFilterCount,
  buildInventoryMovementQuery,
  type InventoryMovementFilters,
} from "@/features/products/inventory-movement-filters";
import { useFormatters } from "@/lib/use-formatters";
import { useInventorySummary, useProducts, useStockMovements } from "@/data/queries";
import { useTranslations } from "next-intl";

export function InventoryOverview() {
  const t = useTranslations("products.inventory");
  const {
    currency: formatCurrency,
    date: formatDate,
    number: formatNumber,
    quantity: formatQuantity,
  } = useFormatters();
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [filters, setFilters] = useState<InventoryMovementFilters>({
    type: "",
    productId: "",
    from: "",
    to: "",
  });
  const movementQuery = buildInventoryMovementQuery(filters, page, pageSize);
  const inventoryMovementsQuery = useStockMovements(movementQuery ?? { page, pageSize }, {
    enabled: movementQuery !== null,
  });
  const activeFilterCount = activeInventoryMovementFilterCount(filters);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const summary = useInventorySummary().data;
  const productsQuery = useProducts({ lowStock: true, pageSize: 10 });
  const lowStockProducts = productsQuery.data.items;
  const inventoryMovements = inventoryMovementsQuery.data.items;
  const updateFilters = (nextFilters: InventoryMovementFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">{t("warehouse")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{t("pageDescription")}</p>
        </div>
        <Link
          href="/productos"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {t("viewProducts")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <Boxes className="size-5 text-emerald-700" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate-500">{t("availableUnits")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatNumber(summary.totalUnits)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <PackageCheck className="size-5 text-sky-700" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate-500">{t("activeProducts")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatNumber(summary.activeProducts)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <AlertTriangle className="size-5 text-amber-700" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate-500">{t("stockAlerts")}</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {formatNumber(summary.lowStockCount)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <Warehouse className="size-5 text-violet-700" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate-500">{t("costValue")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatCurrency(summary.inventoryValueCents)}
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">{t("replenishment")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("minimumProducts")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/productos?stock=low"
                  className="text-sm font-medium text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {t("viewAll")}
                </Link>
                <CircleAlert className="size-5 text-amber-600" aria-hidden="true" />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {lowStockProducts.map((product) => {
                return (
                  <Link
                    key={product.id}
                    href={`/productos/${product.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-amber-50/40"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("sku", { sku: product.sku })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-700">
                        {formatQuantity(product.stock, product.unit)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("minimum", { count: formatNumber(product.minimumStock) })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">{t("history")}</h2>
                <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-emerald-700 hover:bg-emerald-50"
                aria-expanded={filtersOpen}
                aria-controls="inventory-movement-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Filter className="size-4" aria-hidden="true" />
                {t("filter")}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </div>
            <div
              id="inventory-movement-filters"
              hidden={!filtersOpen}
              className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2 xl:grid-cols-4"
            >
              <label className="grid content-start gap-1.5 text-sm font-medium text-slate-700">
                {t("type")}
                <select
                  aria-label={t("filterTypeLabel")}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                  value={filters.type}
                  onChange={(event) =>
                    updateFilters({
                      ...filters,
                      type: event.target.value as StockMovementType | "",
                    })
                  }
                >
                  <option value="">{t("all")}</option>
                  <option value="Ingreso">{t("income")}</option>
                  <option value="Salida">{t("outgoing")}</option>
                  <option value="Ajuste">{t("adjustment")}</option>
                  <option value="Reversion">{t("reversal")}</option>
                </select>
              </label>
              <div className="grid content-start gap-1.5 text-sm font-medium text-slate-700">
                <label htmlFor="inventory-movement-product">{t("product")}</label>
                <ProductPicker
                  id="inventory-movement-product"
                  value={selectedProduct}
                  includeInactive
                  onSelect={(product) => {
                    setSelectedProduct(product);
                    updateFilters({ ...filters, productId: product.id });
                  }}
                />
                {selectedProduct && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit text-slate-600"
                    aria-label={`${t("removeProduct")} ${selectedProduct.name}`}
                    onClick={() => {
                      setSelectedProduct(null);
                      updateFilters({ ...filters, productId: "" });
                    }}
                  >
                    <X className="size-4" aria-hidden="true" />
                    {t("removeProduct")}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <label
                  className="grid content-start gap-1.5 text-sm font-medium text-slate-700"
                  htmlFor="inventory-movement-from"
                >
                  {t("from")}
                  <input
                    id="inventory-movement-from"
                    type="date"
                    aria-describedby={invalidRange ? "inventory-movement-date-error" : undefined}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                    value={filters.from}
                    onChange={(event) => updateFilters({ ...filters, from: event.target.value })}
                  />
                </label>
                <label
                  className="grid content-start gap-1.5 text-sm font-medium text-slate-700"
                  htmlFor="inventory-movement-to"
                >
                  {t("to")}
                  <input
                    id="inventory-movement-to"
                    type="date"
                    aria-describedby={invalidRange ? "inventory-movement-date-error" : undefined}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                    value={filters.to}
                    onChange={(event) => updateFilters({ ...filters, to: event.target.value })}
                  />
                </label>
                {invalidRange && (
                  <p
                    id="inventory-movement-date-error"
                    className="col-span-2 text-sm text-rose-700"
                    role="alert"
                  >
                    {t("dateRangeError")}
                  </p>
                )}
              </div>
              <div className="flex items-end sm:col-span-2 xl:col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedProduct(null);
                    updateFilters({ type: "", productId: "", from: "", to: "" });
                  }}
                >
                  {t("clearFilters")}
                </Button>
              </div>
            </div>
            <Table aria-label={t("tableLabel")} aria-busy={inventoryMovementsQuery.isFetching}>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 text-xs text-slate-500">{t("date")}</TableHead>
                  <TableHead className="text-xs text-slate-500">{t("product")}</TableHead>
                  <TableHead className="hidden text-xs text-slate-500 sm:table-cell">
                    {t("type")}
                  </TableHead>
                  <TableHead className="text-right text-xs text-slate-500">
                    {t("quantity")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className={
                  inventoryMovementsQuery.isFetching && !inventoryMovementsQuery.isLoading
                    ? "opacity-60 transition-opacity"
                    : undefined
                }
              >
                {invalidRange ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                      {t("fixRange")}
                    </TableCell>
                  </TableRow>
                ) : inventoryMovementsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : inventoryMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                      {activeFilterCount > 0 ? t("emptyFiltered") : t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryMovements.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="px-5 text-slate-600">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{entry.productName}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.reference}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-600 hover:bg-slate-100"
                        >
                          {entry.type === "Ingreso"
                            ? t("income")
                            : entry.type === "Salida"
                              ? t("outgoing")
                              : entry.type === "Ajuste"
                                ? t("adjustment")
                                : t("reversal")}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          entry.quantity > 0
                            ? "text-right font-semibold text-emerald-700"
                            : "text-right font-semibold text-amber-700"
                        }
                      >
                        {entry.quantity > 0
                          ? `+${formatNumber(entry.quantity)}`
                          : formatNumber(entry.quantity)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!invalidRange && (
              <ListPagination
                page={page}
                pageSize={pageSize}
                total={inventoryMovementsQuery.data.total}
                disabled={inventoryMovementsQuery.isFetching}
                fixedPageSize
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
