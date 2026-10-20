import { Banknote, CreditCard, Landmark, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import type { CashTotals } from "@/features/cash/types";
import { useFormatters } from "@/lib/use-formatters";

type CashSummaryCardsProps = Readonly<{ totals: CashTotals }>;

export function CashSummaryCards({ totals }: CashSummaryCardsProps) {
  const t = useTranslations("cash.summary");
  const { currency: formatCurrency, number: formatNumber } = useFormatters();
  return (
    <section aria-label={t("label")} className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="bg-sidebar border border-slate-200/80 py-0 text-white shadow-sm ring-0">
        <CardContent className="p-5">
          <Banknote className="size-5 text-emerald-300" aria-hidden="true" />
          <p className="mt-4 text-sm text-emerald-50/80">{t("theoretical")}</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(totals.theoreticalCashCents)}
          </p>
          <p className="text-sidebar-muted mt-2 text-xs">
            {t("initial", { amount: formatCurrency(totals.openingBalanceCents) })}
          </p>
        </CardContent>
      </Card>
      <SummaryCard
        icon={<Landmark />}
        label={t("transfers")}
        value={formatCurrency(totals.byMethod.Transferencia)}
        footnote={t("sessionTotal")}
      />
      <SummaryCard
        icon={<CreditCard />}
        label={t("cards")}
        value={formatCurrency(totals.byMethod.Tarjeta)}
        footnote={t("sessionTotal")}
      />
      <SummaryCard
        icon={<ReceiptText />}
        label={t("movements")}
        value={formatNumber(totals.movementsCount)}
        footnote={t("receipts")}
      />
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  footnote,
}: Readonly<{ icon: React.ReactNode; label: string; value: string; footnote: string }>) {
  return (
    <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
      <CardContent className="p-5">
        <span className="text-emerald-700 [&_svg]:size-5" aria-hidden="true">
          {icon}
        </span>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{footnote}</p>
      </CardContent>
    </Card>
  );
}
