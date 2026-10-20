"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  type FormatLocale,
} from "@/lib/format";

export function useFormatters() {
  const activeLocale = useLocale() as FormatLocale;
  const t = useTranslations("format");

  function quantity(count: number, unit: string): string {
    const normalizedUnit = unit.toLocaleLowerCase("es");
    if (normalizedUnit === "unidad") return t("unit", { count });
    if (normalizedUnit === "metro") return t("meter", { count });
    if (normalizedUnit === "par") return t("pair", { count });
    return `${formatNumber(count, activeLocale)} ${normalizedUnit}`;
  }

  return {
    currency: (value: Parameters<typeof formatCurrency>[0]) => formatCurrency(value, activeLocale),
    date: (value: string) => formatDate(value, activeLocale),
    dateTime: (value: string) => formatDateTime(value, activeLocale),
    number: (value: number) => formatNumber(value, activeLocale),
    time: (value: string) => formatTime(value, activeLocale),
    quantity,
    lowStockCount: (count: number) => t("lowStock", { count }),
    formatQuantity: quantity,
    formatLowStockCount: (count: number) => t("lowStock", { count }),
  };
}
