import { fromCents, type Cents } from "@/lib/money";

export type FormatLocale = "es" | "en";

const timeZone = "America/Argentina/Buenos_Aires";

function intlLocale(locale: FormatLocale): string {
  return locale === "en" ? "en-US" : "es-AR";
}

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

export function formatCurrency(cents: Cents, locale: FormatLocale = "es"): string {
  return normalizeSpaces(
    new Intl.NumberFormat(intlLocale(locale), {
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: "currency",
    }).format(fromCents(cents)),
  );
}

export function formatDate(isoDate: string, locale: FormatLocale = "es"): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat(intlLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`)),
  );
}

export function formatDateTime(iso: string, locale: FormatLocale = "es"): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat(intlLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso)),
  );
}

export function formatTime(iso: string, locale: FormatLocale = "es"): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat(intlLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso)),
  );
}

export function formatNumber(value: number, locale: FormatLocale = "es"): string {
  return normalizeSpaces(new Intl.NumberFormat(intlLocale(locale)).format(value));
}
