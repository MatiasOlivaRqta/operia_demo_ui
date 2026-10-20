"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useForm, type FieldPath } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCashMutations } from "@/data/mutations";
import { cashOpenSchema, type CashOpenValues } from "@/features/cash/schemas";
import { mapFieldErrorsToFields } from "@/features/cash/dialog-logic";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type OpenCashDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onStatus: (message: string, kind?: "success" | "conflict") => void;
}>;
type OpenCashInput = { openingBalanceCents: string };

export function OpenCashDialog({ open, onClose, onStatus }: OpenCashDialogProps) {
  const t = useTranslations("cash.open");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const mutations = useCashMutations();
  const [requestError, setRequestError] = useState("");
  const submitLock = useRef(false);
  const form = useForm<OpenCashInput, undefined, CashOpenValues>({
    defaultValues: { openingBalanceCents: "" },
    resolver: zodResolver(cashOpenSchema),
  });
  const errors = form.formState.errors;

  async function onSubmit(values: CashOpenValues): Promise<void> {
    setRequestError("");
    const result = await mutations.open(values);
    if (!result.ok) {
      if (result.error.code === "validation") {
        const fieldErrors = mapFieldErrorsToFields(result.error.fieldErrors, [
          "openingBalanceCents",
        ] as const);
        const fields = Object.entries(fieldErrors) as [FieldPath<OpenCashInput>, string][];
        for (const [field, message] of fields) form.setError(field, { message, type: "server" });
        if (fields[0]) form.setFocus(fields[0][0]);
      }
      if (result.error.code === "conflict") {
        onStatus(t("conflict"), "conflict");
        onClose();
      } else {
        setRequestError(errorMessage(result.error));
      }
      return;
    }
    onStatus(t("success"));
    form.reset({ openingBalanceCents: "" });
    onClose();
  }

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      await form.handleSubmit(onSubmit)(event);
    } finally {
      submitLock.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submitForm} className="grid gap-4">
          <Field
            htmlFor="opening-balance"
            label={t("balance")}
            error={validationMessage(errors.openingBalanceCents?.message)}
          >
            <Input
              id="opening-balance"
              type="text"
              inputMode="decimal"
              {...form.register("openingBalanceCents")}
              aria-invalid={Boolean(errors.openingBalanceCents)}
              aria-describedby={errors.openingBalanceCents ? "opening-balance-error" : undefined}
            />
          </Field>
          {requestError && (
            <p role="alert" className="text-danger text-sm">
              {requestError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("submitting") : t("action")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
