"use client";

import { Fragment, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { CollectionDialog } from "@/components/features/cash/collection-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerStatusDialog } from "@/components/features/customers/customer-status-dialog";
import { useFormatters } from "@/lib/use-formatters";
import {
  CollectionApplications,
  DocumentCollections,
} from "@/components/features/documents/collection-relations";
import { useErrorMessage } from "@/lib/use-error-message";
import { useTranslations } from "next-intl";
import { personTypes, vatConditions } from "@/features/customers/types";
import { asCents } from "@/lib/money";
import {
  useCustomer,
  useCustomerAccountMovements,
  useCustomerAccountSummary,
  useCashSession,
  useCan,
} from "@/data/queries";

type CustomerDetailProps = { customerId: string };

type DetailItemProps = {
  label: string;
  value: string;
};

function DetailItem({ label, value }: DetailItemProps) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const canWriteCustomers = useCan("customers.write");
  const canWriteCash = useCan("cash.write");
  const canReadAccount = useCan("account.read");
  const t = useTranslations("customers.detail");
  const errorMessage = useErrorMessage();
  const labels = useTranslations("customers.form");
  const vatLabels = {
    [vatConditions.consumer]: labels("vatConsumer"),
    [vatConditions.exempt]: labels("vatExempt"),
    [vatConditions.smallTaxpayer]: labels("vatSmallTaxpayer"),
    [vatConditions.registered]: labels("vatRegistered"),
  };
  const { currency: formatCurrency, dateTime: formatDateTime } = useFormatters();
  const cashSessionQuery = useCashSession();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [expandedMovements, setExpandedMovements] = useState<ReadonlySet<string>>(() => new Set());
  const [collectionStatus, setCollectionStatus] = useState<Readonly<{
    message: string;
    kind: "success" | "conflict";
  }> | null>(null);
  const customerQuery = useCustomer(customerId);
  const summaryQuery = useCustomerAccountSummary(customerId);
  const movementsQuery = useCustomerAccountMovements(customerId);
  const customer = customerQuery.data;
  if (customerQuery.isLoading)
    return (
      <main id="contenido" role="status" className="p-8">
        {labels("loading")}
      </main>
    );
  if (!customer)
    return (
      <main id="contenido" tabIndex={-1} className="p-8">
        <h1 className="text-xl font-semibold">{customerQuery.error?.message ?? t("notFound")}</h1>
        <Link href="/clientes" className="mt-4 inline-block text-emerald-800 underline">
          {t("back")}
        </Link>
      </main>
    );
  const summary = summaryQuery.data;
  const accountMovements = movementsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isActive: boolean = customer.status === "active";
  const address = [customer.address, customer.locality].filter(Boolean).join(", ");
  const cashIsOpen = cashSessionQuery.data?.status === "open";

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <Link
        href="/clientes"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>

      {collectionStatus && (
        <div
          role="status"
          aria-live="polite"
          className={
            collectionStatus.kind === "conflict"
              ? "mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              : "sr-only"
          }
        >
          {collectionStatus.message}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {customer.commercialName}
              </h1>
              <Badge
                className={
                  isActive
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                }
              >
                {isActive ? labels("active") : labels("inactive")}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {customer.personType === personTypes.legal && `${customer.legalName} · `}
              {customer.documentType} {customer.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomerStatusDialog
            customerId={customer.id}
            customerName={customer.commercialName}
            status={customer.status}
          />
          {canWriteCustomers && (
            <Link
              href={`/clientes/${customer.id}/editar`}
              className="bg-sidebar hover:bg-sidebar-accent inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              {t("edit")}
            </Link>
          )}
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label={t("summaryLabel")}>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("balance")}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-amber-700">
              {summary ? formatCurrency(summary.netBalanceCents) : "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t("netBalance")}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("invoiced")}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-900">
              {summary ? formatCurrency(summary.invoicedCents) : "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t("documentsIssued")}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("collected")}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-emerald-700">
              {summary ? formatCurrency(summary.collectedCents) : "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t("collectionsRecorded")}</p>
          </CardContent>
        </Card>
      </section>

      {summaryQuery.isLoading && (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {t("loadingSummary")}
        </p>
      )}
      {summaryQuery.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t("summaryError", { message: summaryQuery.error?.message ?? "" })}
        </p>
      )}

      <Tabs defaultValue="summary" className="mt-8 gap-6">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto border-b border-slate-200 p-0"
        >
          <TabsTrigger
            value="summary"
            className="flex-none px-3 data-active:text-emerald-700 data-active:after:bg-emerald-600"
          >
            {t("summary")}
          </TabsTrigger>
          <TabsTrigger
            value="commercial"
            className="flex-none px-3 data-active:text-emerald-700 data-active:after:bg-emerald-600"
          >
            {t("commercialData")}
          </TabsTrigger>
          <TabsTrigger
            value="fiscal"
            className="flex-none px-3 data-active:text-emerald-700 data-active:after:bg-emerald-600"
          >
            {t("fiscalData")}
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="flex-none px-3 data-active:text-emerald-700 data-active:after:bg-emerald-600"
          >
            {t("account")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
              <CardContent className="p-6">
                <h2 className="font-semibold text-slate-900">{t("contactInfo")}</h2>
                <div className="mt-5 space-y-4 text-sm">
                  {customer.contactEmail && (
                    <p className="flex items-center gap-3 text-slate-600">
                      <Mail className="size-4 text-emerald-700" aria-hidden="true" />
                      {customer.contactEmail}
                    </p>
                  )}
                  {customer.contactPhone && (
                    <p className="flex items-center gap-3 text-slate-600">
                      <Phone className="size-4 text-emerald-700" aria-hidden="true" />
                      {customer.contactPhone}
                    </p>
                  )}
                  {address && (
                    <p className="flex items-center gap-3 text-slate-600">
                      <MapPin className="size-4 text-emerald-700" aria-hidden="true" />
                      {address}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-sidebar border border-slate-200/80 py-0 text-white shadow-sm ring-0">
              <CardContent className="p-6">
                <WalletCards className="size-5 text-emerald-300" aria-hidden="true" />
                <h2 className="mt-4 font-semibold">{t("traceableAccount")}</h2>
                <p className="text-sidebar-muted mt-2 text-sm leading-6">
                  {t("accountDescription")}
                </p>
                {canWriteCash && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sidebar-primary-foreground mt-5 bg-emerald-300 hover:bg-emerald-200"
                    disabled={cashSessionQuery.isLoading || !cashIsOpen}
                    onClick={() => {
                      setCollectionStatus(null);
                      setCollectionOpen(true);
                    }}
                  >
                    {t("registerCollection")}
                  </Button>
                )}
                {!cashSessionQuery.isLoading && !cashIsOpen && (
                  <p className="mt-3 text-sm text-emerald-100">
                    {t("openCashNotice")}{" "}
                    <Link href="/caja" className="font-medium underline underline-offset-2">
                      {t("goToCash")}
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commercial">
          <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
            <CardContent className="p-6">
              <h2 className="font-semibold text-slate-900">{t("commercialData")}</h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label={t("personType")}
                  value={
                    customer.personType === personTypes.natural
                      ? labels("natural")
                      : labels("legal")
                  }
                />
                <DetailItem label={t("legalName")} value={customer.legalName} />
                {customer.personType === personTypes.legal && (
                  <DetailItem label={t("commercialName")} value={customer.commercialName} />
                )}
                <DetailItem label={t("priceList")} value={customer.priceList} />
                <DetailItem label={t("contact")} value={customer.contactName} />
                <DetailItem label={t("email")} value={customer.contactEmail} />
                <DetailItem label={t("phone")} value={customer.contactPhone} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <Card className="border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
            <CardContent className="p-6">
              <h2 className="font-semibold text-slate-900">{t("fiscalData")}</h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label={customer.documentType} value={customer.documentNumber} />
                <DetailItem label={t("vatCondition")} value={vatLabels[customer.vatCondition]} />
                <DetailItem label={t("fiscalAddress")} value={customer.fiscalAddress} />
                <DetailItem label={t("province")} value={customer.province} />
                <DetailItem label={t("locality")} value={customer.locality} />
                <DetailItem label={t("postalCode")} value={customer.postalCode} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="overflow-hidden border border-slate-200/80 bg-white py-0 shadow-sm ring-0">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{t("movements")}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t("balanceSource")}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  {t("calculatedBalance")}
                </Badge>
              </div>
              <Table aria-label={`${t("movements")} de ${customer.commercialName}`}>
                <TableHeader className="bg-slate-50/70">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-5 text-xs font-semibold text-slate-500">
                      {t("date")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      {t("receipt")}
                    </TableHead>
                    <TableHead className="hidden text-xs font-semibold text-slate-500 sm:table-cell">
                      {t("type")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500">
                      {t("debit")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500">
                      {t("credit")}
                    </TableHead>
                    <TableHead className="px-5 text-right text-xs font-semibold text-slate-500">
                      {t("balance")}
                    </TableHead>
                    {canReadAccount && <TableHead aria-label={t("viewCollections")} />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsQuery.isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={canReadAccount ? 7 : 6}
                        role="status"
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        {t("loadingMovements")}
                      </TableCell>
                    </TableRow>
                  )}
                  {movementsQuery.isError && (
                    <TableRow>
                      <TableCell
                        colSpan={canReadAccount ? 7 : 6}
                        role="alert"
                        className="px-5 py-8 text-center text-red-700"
                      >
                        {t("movementError", { message: errorMessage(movementsQuery.error) })}
                      </TableCell>
                    </TableRow>
                  )}
                  {!movementsQuery.isLoading &&
                    !movementsQuery.isError &&
                    accountMovements.map((movement) => {
                      const kindLabels = {
                        DOCUMENT: t("movementKindDocument"),
                        CANCELLATION: t("movementKindCancellation"),
                        COLLECTION: t("movementKindCollection"),
                        CREDIT_APPLIED: t("movementKindCredit"),
                      } as const;
                      const informative = movement.kind === "CREDIT_APPLIED";
                      const relatedDocument =
                        canReadAccount && movement.kind === "DOCUMENT" && movement.documentId;
                      const relatedCollection =
                        canReadAccount && movement.kind === "COLLECTION" && movement.cashMovementId;
                      const expandable = Boolean(relatedDocument || relatedCollection);
                      const expanded = expandedMovements.has(movement.id);
                      const detailsId = `account-movement-details-${movement.id}`;
                      return (
                        <Fragment key={movement.id}>
                          <TableRow key={movement.id}>
                            <TableCell className="px-5 whitespace-nowrap text-slate-600">
                              {formatDateTime(movement.occurredAt)}
                            </TableCell>
                            <TableCell className="font-medium text-slate-800">
                              {movement.reference}
                              {movement.documentNumber &&
                                movement.documentNumber !== movement.reference && (
                                  <span className="block text-xs text-slate-500">
                                    {movement.kind === "CREDIT_APPLIED"
                                      ? t("appliedTo")
                                      : t("allocatedTo")}{" "}
                                    {movement.documentNumber}
                                  </span>
                                )}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {kindLabels[movement.kind]}
                              {informative && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  {t("informative")} ·{" "}
                                  {formatCurrency(movement.appliedCents ?? asCents(0))}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-slate-700">
                              {!informative && movement.debitCents > 0
                                ? formatCurrency(movement.debitCents)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right text-slate-700">
                              {!informative && movement.creditCents > 0
                                ? formatCurrency(movement.creditCents)
                                : "—"}
                            </TableCell>
                            <TableCell className="px-5 text-right font-medium whitespace-nowrap text-slate-900">
                              {formatCurrency(movement.balanceCents)}
                            </TableCell>
                            {canReadAccount && (
                              <TableCell className="w-12 px-2">
                                {expandable && (
                                  <button
                                    type="button"
                                    aria-label={
                                      expanded ? t("hideCollections") : t("viewCollections")
                                    }
                                    aria-expanded={expanded}
                                    aria-controls={detailsId}
                                    onClick={() =>
                                      setExpandedMovements((current) => {
                                        const next = new Set(current);
                                        if (expanded) next.delete(movement.id);
                                        else next.add(movement.id);
                                        return next;
                                      })
                                    }
                                    className="rounded p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"
                                  >
                                    {expanded ? (
                                      <ChevronDown className="size-4" aria-hidden="true" />
                                    ) : (
                                      <ChevronRight className="size-4" aria-hidden="true" />
                                    )}
                                  </button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                          {expandable && (
                            <TableRow
                              id={detailsId}
                              key={`${movement.id}-details`}
                              hidden={!expanded}
                            >
                              <TableCell colSpan={7} className="bg-slate-50 px-5 py-4">
                                {relatedDocument ? (
                                  <DocumentCollections
                                    documentId={movement.documentId!}
                                    open={expanded}
                                  />
                                ) : null}
                                {relatedCollection ? (
                                  <CollectionApplications
                                    customerId={customerId}
                                    cashMovementId={movement.cashMovementId!}
                                    open={expanded}
                                  />
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  {!movementsQuery.isLoading &&
                    !movementsQuery.isError &&
                    accountMovements.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={canReadAccount ? 7 : 6}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          {t("noMovements")}
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
              {movementsQuery.hasNextPage && (
                <div className="flex justify-center border-t border-slate-100 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={movementsQuery.isFetchingNextPage}
                    onClick={() => void movementsQuery.fetchNextPage()}
                  >
                    {movementsQuery.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {canWriteCash && (
        <CollectionDialog
          customer={{ id: customer.id, commercialName: customer.commercialName }}
          open={collectionOpen}
          onClose={() => setCollectionOpen(false)}
          onStatus={(message, kind = "success") => setCollectionStatus({ message, kind })}
        />
      )}
    </main>
  );
}
