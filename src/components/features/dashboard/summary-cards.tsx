"use client";

import { Banknote, PackageCheck, ReceiptText, UsersRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardSummary } from "@/data/queries";
import { useFormatters } from "@/lib/use-formatters";
import { useTranslations } from "next-intl";

function percentageChange(
  current: number,
  previous: number,
  t: ReturnType<typeof useTranslations>,
  number: (value: number) => string,
): string {
  if (previous === 0) return t("dashboard.summary.noSalesYesterday");
  const change = Math.round(((current - previous) / previous) * 100);
  return t("dashboard.summary.changeVsYesterday", {
    change: `${change > 0 ? "+" : ""}${number(change)}`,
  });
}

export function SummaryCards() {
  const t = useTranslations();
  const formatters = useFormatters();
  const summary = useDashboardSummary();
  const metrics: ReadonlyArray<{ label: string; icon: LucideIcon; value: string; detail: string }> =
    summary.data
      ? [
          {
            label: t("dashboard.summary.salesToday"),
            icon: ReceiptText,
            value: formatters.currency(summary.data.salesToday.totalCents),
            detail: percentageChange(
              summary.data.salesToday.totalCents,
              summary.data.salesToday.previousDayTotalCents,
              t,
              formatters.number,
            ),
          },
          {
            label: t("dashboard.summary.payments"),
            icon: Banknote,
            value: formatters.currency(summary.data.collectionsToday.totalCents),
            detail: t("dashboard.summary.paymentCount", {
              count: summary.data.collectionsToday.count,
            }),
          },
          {
            label: t("dashboard.summary.customerAccount"),
            icon: UsersRound,
            value: formatters.currency(summary.data.receivables.balanceCents),
            detail: t("dashboard.summary.customersWithBalance", {
              count: summary.data.receivables.customersWithBalance,
            }),
          },
          {
            label: t("dashboard.summary.stockToReview"),
            icon: PackageCheck,
            value: t("dashboard.summary.productsCount", { count: summary.data.lowStockCount }),
            detail: t("dashboard.summary.lowStockProducts"),
          },
        ]
      : [];

  return (
    <section
      className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label={t("dashboard.summary.label")}
    >
      {summary.isLoading ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:col-span-2 xl:col-span-4"
        >
          {t("dashboard.summary.loading")}
        </p>
      ) : summary.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-white p-5 sm:col-span-2 xl:col-span-4"
        >
          <p className="text-sm text-slate-700">{t("dashboard.summary.error")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void summary.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0"
            >
              <CardContent className="p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-5 text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
              </CardContent>
            </Card>
          );
        })
      )}
    </section>
  );
}
