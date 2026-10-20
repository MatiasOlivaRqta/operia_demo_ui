"use client";

import { memo, useEffect, useState } from "react";
import { ChevronRight, Ellipsis, Plus, Search } from "lucide-react";
import Link from "next/link";
import { ListPagination } from "@/components/common/list-pagination";
import { totalPages } from "@/components/common/list-pagination-logic";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCan, useCustomers } from "@/data/queries";
import { calculateCustomerBalance } from "@/features/customers/domain";
import type { Customer } from "@/features/customers/types";
import { useFormatters } from "@/lib/use-formatters";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useTranslations } from "next-intl";
import { vatConditions } from "@/features/customers/types";

const CustomerRow = memo(function CustomerRow({ customer }: { customer: Customer }) {
  const t = useTranslations("customers.list");
  const { currency: formatCurrency } = useFormatters();
  const balance = customer.balanceCents ?? calculateCustomerBalance(customer.movements);
  const isActive = customer.status === "active";
  return (
    <TableRow className="group">
      <TableCell className="px-5 py-3">
        <Link
          href={`/clientes/${customer.id}`}
          className="block outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <p className="font-medium text-slate-800 group-hover:text-emerald-800">
            {customer.commercialName}
          </p>
          <p className="mt-1 text-xs text-slate-500 md:hidden">
            {customer.documentType} {customer.documentNumber}
          </p>
        </Link>
      </TableCell>
      <TableCell className="hidden text-slate-600 md:table-cell">
        {customer.documentType} {customer.documentNumber}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <p className="text-slate-700">{customer.contactName || customer.contactPhone}</p>
        <p className="mt-1 text-xs text-slate-500">{customer.contactEmail}</p>
      </TableCell>
      <TableCell className="hidden text-slate-600 xl:table-cell">{customer.vatCondition}</TableCell>
      <TableCell className="text-right font-medium text-slate-800">
        <span className={balance > 0 ? "text-amber-700" : "text-slate-500"}>
          {formatCurrency(balance)}
        </span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge
          className={
            isActive
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              : "bg-slate-100 text-slate-500 hover:bg-slate-100"
          }
        >
          {isActive ? t("active") : t("inactive")}
        </Badge>
      </TableCell>
      <TableCell className="pr-4">
        <Link
          href={`/clientes/${customer.id}`}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <Ellipsis className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("view", { name: customer.commercialName })}</span>
        </Link>
      </TableCell>
    </TableRow>
  );
});

export function CustomersList() {
  const canWriteCustomers = useCan("customers.write");
  const t = useTranslations("customers.list");
  const { number: formatNumber } = useFormatters();
  const statusFilterItems = {
    all: t("all"),
    active: t("activePlural"),
    inactive: t("inactivePlural"),
  };
  const vatConditionFilterItems = {
    all: t("vatFilter"),
    [vatConditions.consumer]: t("consumer"),
    [vatConditions.exempt]: t("exempt"),
    [vatConditions.smallTaxpayer]: t("smallTaxpayer"),
    [vatConditions.registered]: t("registered"),
  };
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("all");
  const [vatCondition, setVatCondition] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const customerQuery = useCustomers({
    search: debouncedSearch,
    status,
    vatCondition,
    page,
    pageSize,
  });
  const { items, total } = customerQuery.data;
  const boundedPage = Math.min(page, totalPages(total, pageSize));
  useEffect(() => {
    if (page > totalPages(total, pageSize)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the active query on the last valid offset after server totals shrink.
      setPage(totalPages(total, pageSize));
    }
  }, [page, pageSize, total]);

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
        {canWriteCustomers && (
          <Link
            href="/clientes/nuevo"
            className="bg-sidebar hover:bg-sidebar-accent inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Link>
        )}
      </div>

      <section
        className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
        aria-labelledby="customers-table-title"
        aria-busy={customerQuery.isFetching}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="customers-table-title" className="sr-only">
            {t("tableTitle")}
          </h2>
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
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              items={statusFilterItems}
              onValueChange={(value) => {
                setStatus(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-36 border-slate-200 text-slate-600"
                aria-label={t("status")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusFilterItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={vatCondition}
              items={vatConditionFilterItems}
              onValueChange={(value) => {
                setVatCondition(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-48 border-slate-200 text-slate-600"
                aria-label={t("vatFilter")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(vatConditionFilterItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table aria-label={t("tableLabel")}>
          <TableHeader className="bg-slate-50/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5 text-xs font-semibold text-slate-500">
                {t("customer")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 md:table-cell">
                {t("document")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 lg:table-cell">
                {t("contact")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 xl:table-cell">
                {t("vat")}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-500">
                {t("balance")}
              </TableHead>
              <TableHead className="hidden text-xs font-semibold text-slate-500 sm:table-cell">
                {t("status")}
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody
            className={
              customerQuery.isFetching && !customerQuery.isLoading
                ? "opacity-60 transition-opacity"
                : undefined
            }
          >
            {customerQuery.isLoading ? (
              Array.from({ length: pageSize }, (_, index) => (
                <TableRow key={index} className="h-[65px]">
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : customerQuery.error ? (
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
                    {t("empty")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((customer) => <CustomerRow key={customer.id} customer={customer} />)
            )}
          </TableBody>
        </Table>
        <ListPagination
          page={boundedPage}
          pageSize={pageSize}
          total={total}
          disabled={customerQuery.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500" role="status">
          {t("showing", { shown: formatNumber(items.length), total: formatNumber(total) })}
        </p>
      </section>
    </main>
  );
}
