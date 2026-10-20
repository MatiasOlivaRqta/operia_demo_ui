"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CashHeader } from "@/components/features/cash/cash-header";
import { CashLoading } from "@/components/features/cash/cash-loading";
import {
  CashMovementsTable,
  CASH_MOVEMENTS_PAGE_SIZE,
} from "@/components/features/cash/cash-movements-table";
import { CashSummaryCards } from "@/components/features/cash/cash-summary-cards";
import { CloseCashDialog } from "@/components/features/cash/close-cash-dialog";
import { CollectionDialog } from "@/components/features/cash/collection-dialog";
import { OpenCashDialog } from "@/components/features/cash/open-cash-dialog";
import { Button } from "@/components/ui/button";
import { useCan, useCashMovements, useCashSession, useCashTotals } from "@/data/queries";
import { decideCashDialogSessionTransition, type CashDialog } from "@/features/cash/dialog-logic";
import { emptyCashTotals } from "@/features/cash/types";
import { decideCashAction } from "@/features/cash/action-logic";

type CashNoticeKind = "success" | "conflict";

function CashActionListener({
  isLoading,
  hasOpenSession,
  onOpen,
}: Readonly<{ isLoading: boolean; hasOpenSession: boolean; onOpen: () => void }>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef(false);
  const action = searchParams.get("accion");

  useEffect(() => {
    const decision = decideCashAction(action, isLoading, hasOpenSession, handled.current);
    if (decision === "wait" || decision === "none") return;
    handled.current = true;
    if (decision === "open") onOpen();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("accion");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [action, hasOpenSession, isLoading, onOpen, pathname, router, searchParams]);
  return null;
}

function CashConflictNotice({
  message,
  onDismiss,
}: Readonly<{ message: string; onDismiss: () => void }>) {
  const t = useTranslations("cash.overview");
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p>{message}</p>
      <button
        type="button"
        aria-label={t("dismiss")}
        className="rounded px-2 py-1 font-medium hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

function CashStatusAnnouncement({
  status,
  onDismiss,
}: Readonly<{
  status: Readonly<{ message: string; kind: CashNoticeKind }> | null;
  onDismiss: () => void;
}>) {
  if (status?.kind === "conflict") {
    return <CashConflictNotice message={status.message} onDismiss={onDismiss} />;
  }
  if (!status) return null;
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {status.message}
    </p>
  );
}

export function CashOverview() {
  const canWriteCash = useCan("cash.write");
  const t = useTranslations("cash.overview");
  const cashQuery = useCashSession();
  const sessionId = cashQuery.data?.id;
  const [pagination, setPagination] = useState<{ page: number; sessionId: string | undefined }>({
    page: 1,
    sessionId: undefined,
  });
  const [activeDialog, setActiveDialog] = useState<CashDialog>(null);
  const [status, setStatus] = useState<Readonly<{ message: string; kind: CashNoticeKind }> | null>(
    null,
  );
  const reportStatus = (message: string, kind: CashNoticeKind = "success") =>
    setStatus({ message, kind });
  const openDialog = (dialog: Exclude<CashDialog, null>) => {
    setStatus(null);
    setActiveDialog(dialog);
  };
  const pageNumber = pagination.sessionId === sessionId ? pagination.page : 1;
  const totalsQuery = useCashTotals();
  const movementsQuery = useCashMovements(pageNumber, CASH_MOVEMENTS_PAGE_SIZE);

  const hasSession = cashQuery.data?.status === "open";
  const previousHasSession = useRef(hasSession);
  useEffect(() => {
    const transition = decideCashDialogSessionTransition(
      activeDialog,
      previousHasSession.current,
      hasSession,
    );
    previousHasSession.current = hasSession;

    if (transition.cerrarDialogo) {
      setActiveDialog(null);
      if (transition.messageKey)
        setStatus({
          message: t(transition.messageKey),
          kind: "conflict",
        });
    }
  }, [activeDialog, hasSession, t]);

  const loadError = cashQuery.isError || (hasSession && totalsQuery.isError);
  const movementError = hasSession && movementsQuery.isError;

  if (cashQuery.isLoading) {
    return (
      <>
        <CashStatusAnnouncement status={status} onDismiss={() => setStatus(null)} />
        <CashLoading />
      </>
    );
  }

  if (loadError) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
      >
        <CashStatusAnnouncement status={status} onDismiss={() => setStatus(null)} />
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-950">{t("loadError")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("loadDescription")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              void cashQuery.refetch();
              if (hasSession) void totalsQuery.refetch();
            }}
          >
            {t("retry")}
          </Button>
        </div>
      </main>
    );
  }

  if (hasSession && totalsQuery.isLoading) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
      >
        <CashStatusAnnouncement status={status} onDismiss={() => setStatus(null)} />
        <CashHeader
          session={cashQuery.data}
          onOpen={() => openDialog("open")}
          onCollect={() => openDialog("collection")}
          onClose={() => openDialog("close")}
        />
        <p
          role="status"
          className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
        >
          {t("loadingTotals")}
        </p>
      </main>
    );
  }

  const totals = hasSession ? totalsQuery.data : emptyCashTotals;
  const page = movementsQuery.data;

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <CashStatusAnnouncement status={status} onDismiss={() => setStatus(null)} />
      {canWriteCash && (
        <Suspense fallback={null}>
          <CashActionListener
            isLoading={cashQuery.isLoading}
            hasOpenSession={hasSession}
            onOpen={() => openDialog("collection")}
          />
        </Suspense>
      )}
      <CashHeader
        session={cashQuery.data}
        onOpen={() => openDialog("open")}
        onCollect={() => openDialog("collection")}
        onClose={() => openDialog("close")}
      />
      <CashSummaryCards totals={totals} />
      {hasSession &&
        (movementsQuery.isLoading ? (
          <p
            role="status"
            className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
          >
            {t("loadingMovements")}
          </p>
        ) : movementError ? (
          <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-white p-6">
            <p className="text-sm text-slate-700">{t("movementError")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void movementsQuery.refetch()}
            >
              {t("retry")}
            </Button>
          </div>
        ) : (
          <CashMovementsTable
            page={page}
            isFetching={movementsQuery.isFetching}
            onPageChange={(page) => setPagination({ page, sessionId })}
          />
        ))}
      {canWriteCash && (
        <OpenCashDialog
          open={activeDialog === "open"}
          onClose={() => setActiveDialog(null)}
          onStatus={reportStatus}
        />
      )}
      {canWriteCash && (
        <CloseCashDialog
          open={activeDialog === "close" && hasSession}
          onClose={() => setActiveDialog(null)}
          onStatus={reportStatus}
        />
      )}
      {canWriteCash && (
        <CollectionDialog
          open={activeDialog === "collection" && hasSession}
          onClose={() => setActiveDialog(null)}
          onStatus={reportStatus}
          onCollected={() => setPagination({ page: 1, sessionId })}
        />
      )}
    </main>
  );
}
