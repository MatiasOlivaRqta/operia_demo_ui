"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getPageRange, totalPages } from "./list-pagination-logic";

type ListPaginationProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
  fixedPageSize?: boolean;
}>;

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  fixedPageSize = false,
}: ListPaginationProps) {
  const t = useTranslations("common.pagination");
  const pages = totalPages(total, pageSize);
  const range = getPageRange(page, pageSize, total);
  const safePage = Math.min(page, pages);

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-slate-600" role="status" aria-live="polite">
        {t("range", { from: range.from, to: range.to, total: Math.max(0, total) })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!fixedPageSize && onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>{t("perPage")}</span>
            <select
              aria-label={t("size")}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              value={pageSize}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          {t("previous")}
        </Button>
        <span className="min-w-20 text-center text-sm text-slate-600" aria-hidden="true">
          {t("page", { current: safePage, total: pages })}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
        >
          {t("next")}
        </Button>
      </div>
    </nav>
  );
}
