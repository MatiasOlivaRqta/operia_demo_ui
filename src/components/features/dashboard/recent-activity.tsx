"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardActivity } from "@/data/queries";
import type { DashboardActivityItem } from "@/features/dashboard/types";
import { useFormatters } from "@/lib/use-formatters";
import { asCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { documentStatusLabel } from "@/components/features/documents/document-status";
import type { DocumentStatus } from "@/features/documents/types";

function eventTitle(item: DashboardActivityItem, t: ReturnType<typeof useTranslations>): string {
  if (item.kind === "document")
    return t("dashboard.activity.document", { reference: item.reference });
  if (item.kind === "collection")
    return t("dashboard.activity.payment", { reference: item.reference });
  return t("dashboard.activity.stockMovement");
}

function eventDetail(
  item: DashboardActivityItem,
  formatters: ReturnType<typeof useFormatters>,
): string {
  if (item.kind === "stock_movement") {
    const quantity = item.quantity ?? 0;
    // El backend manda la cantidad con signo; en ingresos y salidas el tipo ya indica el sentido.
    const shown =
      item.status === "INGRESO" || item.status === "SALIDA" ? Math.abs(quantity) : quantity;
    return `${item.counterparty} · ${item.status.toLocaleLowerCase("es")} ${formatters.number(shown)}`;
  }
  return `${item.counterparty} · ${formatters.currency(item.amountCents ?? asCents(0))}`;
}

function eventStatus(
  status: DashboardActivityItem["status"],
  t: ReturnType<typeof useTranslations>,
): string {
  if (
    status === "PENDING" ||
    status === "PARTIAL" ||
    status === "COMPLETED" ||
    status === "CANCELLED"
  ) {
    return t(`documents.status.${documentStatusLabel(status as DocumentStatus)}`);
  }
  const labels: Record<DashboardActivityItem["status"], string> = {
    PENDING: "dashboard.activity.pending",
    PARTIAL: "dashboard.activity.partial",
    COMPLETED: "dashboard.activity.completed",
    CANCELLED: "dashboard.activity.cancelled",
    COLLECTED: "dashboard.activity.collected",
    INGRESO: "dashboard.activity.income",
    SALIDA: "dashboard.activity.outgoing",
    AJUSTE: "dashboard.activity.adjustment",
    REVERSION: "dashboard.activity.reversal",
  };
  return t(labels[status]);
}

function eventHref(item: DashboardActivityItem): string {
  if (item.kind === "document") return `/comprobantes/${encodeURIComponent(item.refId)}`;
  if (item.kind === "collection") return "/caja";
  return `/productos/${encodeURIComponent(item.refId)}`;
}

export function RecentActivity() {
  const t = useTranslations();
  const formatters = useFormatters();
  const activity = useDashboardActivity();
  const items = activity.data?.items ?? [];
  return (
    <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">{t("dashboard.activity.title")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("dashboard.activity.subtitle")}</p>
          </div>
        </div>
        {activity.isLoading ? (
          <p role="status" className="px-5 py-6 text-sm text-slate-600">
            {t("dashboard.activity.loading")}
          </p>
        ) : activity.error ? (
          <div role="alert" className="p-5">
            <p className="text-sm text-slate-700">{t("dashboard.activity.error")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => void activity.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p role="status" className="px-5 py-6 text-sm text-slate-500">
            {t("dashboard.activity.empty")}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <Link
                key={`${item.kind}:${item.id}`}
                href={eventHref(item)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <ClipboardList className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {eventTitle(item, t)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {eventDetail(item, formatters)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-600 hover:bg-slate-100"
                  >
                    {eventStatus(item.status, t)}
                  </Badge>
                  <time dateTime={item.occurredAt} className="text-xs text-slate-500">
                    {formatters.dateTime(item.occurredAt)}
                  </time>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
