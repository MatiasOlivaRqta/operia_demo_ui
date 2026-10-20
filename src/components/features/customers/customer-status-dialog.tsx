"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCustomerMutations } from "@/data/mutations";
import { useCan } from "@/data/queries";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerStatus } from "@/features/customers/types";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/lib/use-error-message";
import type { AppError } from "@/lib/result";

type CustomerStatusDialogProps = {
  customerId: string;
  customerName: string;
  status: CustomerStatus;
};

export function CustomerStatusDialog({
  customerId,
  customerName,
  status,
}: CustomerStatusDialogProps) {
  const t = useTranslations("customers.statusDialog");
  const canWriteCustomers = useCan("customers.write");
  const getErrorMessage = useErrorMessage();
  const mutations = useCustomerMutations();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const isActive: boolean = status === "active";
  const actionLabel: string = isActive ? t("disable") : t("reactivateCustomer");

  function openDialog(): void {
    setIsOpen(true);
  }

  function closeDialog(): void {
    setIsOpen(false);
  }

  function handleOpenChange(open: boolean): void {
    setIsOpen(open);
  }

  if (!canWriteCustomers) return null;

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 text-slate-700 hover:bg-slate-100"
          onClick={openDialog}
        >
          {actionLabel}
        </Button>
        <DialogContent className="border-slate-200 bg-white p-0 text-slate-900">
          <DialogHeader className="p-6 pb-3">
            <span className="mb-2 grid size-9 place-items-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription className="leading-6 text-slate-500">
              {isActive
                ? t("disableDescription", { name: customerName })
                : t("enableDescription", { name: customerName })}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-danger px-6 text-sm">
              {getErrorMessage(error)}
            </p>
          )}
          <DialogFooter className="mx-0 mb-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            <Button
              type="button"
              className="bg-sidebar hover:bg-sidebar-accent text-white"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                const result = await mutations.setStatus(
                  customerId,
                  isActive ? "inactive" : "active",
                );
                if (!result.ok) {
                  setError(result.error);
                  setSaving(false);
                  return;
                }
                setStatusMessage(isActive ? t("disabled") : t("enabled"));
                closeDialog();
                setSaving(false);
              }}
            >
              {saving ? t("saving") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
