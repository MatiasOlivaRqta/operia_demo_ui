"use client";

import { Banknote, LockKeyhole, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CashSession } from "@/features/cash/types";
import { useCan } from "@/data/queries";

type CashHeaderProps = Readonly<{
  onClose: () => void;
  onCollect: () => void;
  onOpen: () => void;
  session: CashSession | undefined;
}>;

export function CashHeader({ onClose, onCollect, onOpen, session }: CashHeaderProps) {
  const t = useTranslations("cash.header");
  const canWriteCash = useCan("cash.write");
  const isOpen = session?.status === "open";
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("register")}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{t("title")}</h1>
          <Badge
            className={
              isOpen
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : "bg-slate-100 text-slate-700 hover:bg-slate-100"
            }
          >
            {isOpen ? t("open") : t("closed")}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {isOpen ? t("openedBy", { name: session.openedBy.name }) : t("noSession")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canWriteCash && isOpen ? (
          <>
            <Button type="button" onClick={onCollect}>
              <ReceiptText aria-hidden="true" />
              {t("collect")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              <LockKeyhole aria-hidden="true" />
              {t("close")}
            </Button>
          </>
        ) : canWriteCash ? (
          <Button type="button" variant="outline" onClick={onOpen}>
            <Banknote aria-hidden="true" />
            {t("openAction")}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
