"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Banknote, CreditCard, Wallet } from "lucide-react";
import { DocumentStatusBadge } from "@/components/features/documents/document-status";
import { useCollectionApplications, useDocumentCollections } from "@/data/queries";
import { useFormatters } from "@/lib/use-formatters";

const paymentMethodLabels = {
  CASH: "cash",
  TRANSFER: "transfer",
  CARD: "card",
} as const;

const paymentMethodIcons = {
  CASH: Banknote,
  TRANSFER: ArrowLeftRight,
  CARD: CreditCard,
} as const;

export function DocumentCollections({ documentId, open }: { documentId: string; open: boolean }) {
  const t = useTranslations("documents.collections");
  const format = useFormatters();
  const query = useDocumentCollections(documentId, open);

  if (query.isLoading) return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-destructive text-sm">
        {t("error")}
      </p>
    );

  return (
    <section aria-label={t("title")} className="space-y-3">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t("total")}
          </dt>
          <dd className="mt-1 text-right font-semibold text-slate-800 tabular-nums">
            {format.currency(query.data.totalCents)}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t("paid")}
          </dt>
          <dd className="mt-1 text-right font-semibold text-emerald-700 tabular-nums">
            {format.currency(query.data.paidCents)}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t("pending")}
          </dt>
          <dd
            className={`mt-1 text-right font-semibold tabular-nums ${
              query.data.pendingCents > 0 ? "text-amber-700" : "text-slate-500"
            }`}
          >
            {format.currency(query.data.pendingCents)}
          </dd>
        </div>
      </dl>
      {query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ol className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {query.data.items.map((item, index) => (
            <li
              className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
              key={`${item.cashMovementId ?? item.kind}-${item.occurredAt}-${index}`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                  {item.kind === "CREDIT_APPLIED" ? (
                    <Wallet className="size-3.5" aria-hidden="true" />
                  ) : (
                    (() => {
                      const PaymentIcon = paymentMethodIcons[item.paymentMethod ?? "CASH"];
                      return <PaymentIcon className="size-3.5" aria-hidden="true" />;
                    })()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-slate-700">
                    <time dateTime={item.occurredAt}>{format.date(item.occurredAt)}</time>
                    <span className="mx-2 text-slate-300">·</span>
                    {item.kind === "CREDIT_APPLIED"
                      ? t("creditApplied")
                      : t(paymentMethodLabels[item.paymentMethod ?? "CASH"])}
                  </p>
                  {item.receiptNumber ? (
                    <p className="mt-0.5 text-xs text-slate-500">{item.receiptNumber}</p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-right font-semibold text-slate-800 tabular-nums">
                {format.currency(item.amountCents)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function CollectionApplications({
  customerId,
  cashMovementId,
  open,
}: {
  customerId: string;
  cashMovementId: string;
  open: boolean;
}) {
  const t = useTranslations("documents.collections");
  const format = useFormatters();
  const query = useCollectionApplications(customerId, cashMovementId, open);

  if (query.isLoading) return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-destructive text-sm">
        {t("error")}
      </p>
    );

  return (
    <section aria-label={t("coveredDocuments")} className="space-y-3">
      {query.data.documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noApplications")}</p>
      ) : (
        <>
          <h3 className="text-sm font-medium">{t("coveredDocuments")}</h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {query.data.documents.map((document) => (
              <li
                className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                key={document.documentId}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    className="truncate font-medium text-slate-800 underline-offset-4 hover:text-emerald-700 hover:underline"
                    href={`/comprobantes/${encodeURIComponent(document.documentId)}`}
                  >
                    {document.documentNumber}
                  </Link>
                  <DocumentStatusBadge status={document.status} />
                </div>
                <span className="shrink-0 text-right font-semibold text-slate-800 tabular-nums">
                  {format.currency(document.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {query.data.creditGeneratedCents > 0 ? (
        <p className="flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <span>{t("creditGenerated")}</span>
          <span className="shrink-0 text-right font-semibold tabular-nums">
            {format.currency(query.data.creditGeneratedCents)}
          </span>
        </p>
      ) : null}
    </section>
  );
}
