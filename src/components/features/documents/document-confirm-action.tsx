"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentMutations } from "@/data/mutations";
import { useCan } from "@/data/queries";
import { useErrorMessage } from "@/lib/use-error-message";
import type { DocumentStatus } from "@/features/documents/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentConfirmActionProps = {
  documentId: string;
  documentNumber?: string;
  documentStatus?: DocumentStatus;
  mode: "cancel" | "complete";
};

export function DocumentConfirmAction({
  documentId,
  documentNumber,
  documentStatus,
  mode,
}: DocumentConfirmActionProps) {
  const t = useTranslations("documents.confirm");
  const errorMessage = useErrorMessage();
  const mutations = useDocumentMutations();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const isCancellation: boolean = mode === "cancel";
  const canCancelDocuments = useCan("documents.cancel");
  const actionLabel: string = isCancellation ? t("cancel") : t("complete");
  function openDialog(): void {
    setIsOpen(true);
  }
  function closeDialog(): void {
    setIsOpen(false);
  }
  function handleOpenChange(open: boolean): void {
    setIsOpen(open);
  }
  if (isCancellation && (!canCancelDocuments || documentStatus !== "PENDING")) return null;

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <Button
          type="button"
          className={
            isCancellation
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-sidebar hover:bg-sidebar-accent text-white"
          }
          onClick={openDialog}
        >
          {isCancellation ? (
            <FileX2 className="size-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {actionLabel}
        </Button>
        <DialogContent className="border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription>
              {isCancellation
                ? t("cancelDescription", { number: documentNumber ?? "" })
                : t("completeDescription")}
            </DialogDescription>
          </DialogHeader>
          {isCancellation && (
            <div className="grid gap-2">
              <Label htmlFor={`cancel-reason-${documentId}`}>{t("reason")}</Label>
              <Input
                id={`cancel-reason-${documentId}`}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `cancel-error-${documentId}` : undefined}
              />
            </div>
          )}
          {error && (
            <p id={`cancel-error-${documentId}`} role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              {t("cancelButton")}
            </Button>
            <Button
              type="button"
              className={
                isCancellation
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-sidebar hover:bg-sidebar-accent text-white"
              }
              disabled={saving || (isCancellation && !reason.trim())}
              onClick={async () => {
                if (!isCancellation) return;
                setSaving(true);
                setError("");
                const result = await mutations.cancel(documentId, reason);
                if (!result.ok) {
                  setError(errorMessage(result.error));
                  setSaving(false);
                  return;
                }
                setStatusMessage(t("cancelled", { number: documentNumber ?? "" }));
                closeDialog();
              }}
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
