import { ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/common/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Page } from "@/data/api";
import type { CashMovement } from "@/features/cash/types";
import { useFormatters } from "@/lib/use-formatters";

export const CASH_MOVEMENTS_PAGE_SIZE = 25;

type CashMovementsTableProps = Readonly<{
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  page: Page<CashMovement>;
}>;

export function CashMovementsTable({
  isFetching = false,
  onPageChange,
  page,
}: CashMovementsTableProps) {
  const t = useTranslations("cash.movements");
  const { currency: formatCurrency, time: formatTime } = useFormatters();
  return (
    <Card className="mt-8 w-full overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
        </div>
        {page.total === 0 ? (
          <EmptyState
            icon={<ReceiptText className="size-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div aria-busy={isFetching}>
            <Table aria-label={t("tableLabel")}>
              <TableHeader className="bg-slate-50/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 text-xs text-slate-500">{t("time")}</TableHead>
                  <TableHead className="text-xs text-slate-500">{t("customerReceipt")}</TableHead>
                  <TableHead className="hidden text-xs text-slate-500 sm:table-cell">
                    {t("method")}
                  </TableHead>
                  <TableHead className="text-right text-xs text-slate-500">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="px-5 text-slate-600">
                      {formatTime(movement.date)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-800">{movement.customerName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.receiptNumber} · {movement.documentNumber ?? t("account")}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600 hover:bg-slate-100"
                      >
                        {movement.paymentMethod === "Efectivo"
                          ? t("cash")
                          : movement.paymentMethod === "Transferencia"
                            ? t("transfer")
                            : t("card")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {formatCurrency(movement.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {page.total > 0 && (
          <ListPagination
            page={page.page}
            pageSize={CASH_MOVEMENTS_PAGE_SIZE}
            total={page.total}
            onPageChange={onPageChange}
            fixedPageSize
            disabled={isFetching}
          />
        )}
      </CardContent>
    </Card>
  );
}
