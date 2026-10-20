"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import type { FormEvent } from "react";
import type { z } from "zod";
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
import { useCashSession, useCashTotals } from "@/data/queries";
import {
  calculateIndicativeDifference,
  mapFieldErrorsToFields,
} from "@/features/cash/dialog-logic";
import { cashCloseSchema, type CashCloseValues } from "@/features/cash/schemas";
import { useFormatters } from "@/lib/use-formatters";
import { parsePesosToCents } from "@/lib/money";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type CloseCashInput = z.input<typeof cashCloseSchema>;
type CloseCashDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onStatus: (message: string, kind?: "success" | "conflict") => void;
}>;

export function CloseCashDialog({ open, onClose, onStatus }: CloseCashDialogProps) {
  const t = useTranslations("cash.close");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const { currency: formatCurrency } = useFormatters();
  const mutations = useCashMutations();
  const submitLock = useRef(false);
  const sessionQuery = useCashSession();
  const totalsQuery = useCashTotals();
  const theoreticalCashCents = totalsQuery.data.theoreticalCashCents;
  const form = useForm<CloseCashInput, undefined, CashCloseValues>({
    defaultValues: { declaredBalanceCents: "", observation: "" },
    resolver: zodResolver(cashCloseSchema),
  });
  const errors = form.formState.errors;
  const declaredText = useWatch({ control: form.control, name: "declaredBalanceCents" }) ?? "";
  const declaredCents = parsePesosToCents(declaredText);
  const difference = calculateIndicativeDifference(declaredCents, theoreticalCashCents);

  async function onSubmit(values: CashCloseValues): Promise<void> {
    const session = sessionQuery.data;
    if (!session) return;
    const result = await mutations.close(session.id, values);
    if (!result.ok) {
      if (result.error.code === "validation") {
        const fieldErrors = mapFieldErrorsToFields(result.error.fieldErrors, [
          "observation",
          "declaredBalanceCents",
        ] as const);
        const fields = Object.entries(fieldErrors) as [FieldPath<CloseCashInput>, string][];
        for (const [field, message] of fields) form.setError(field, { message, type: "server" });
        if (fields[0]) form.setFocus(fields[0][0]);
        return;
      }
      if (result.error.code === "conflict") {
        onStatus(t("conflict"), "conflict");
        onClose();
        return;
      }
      form.setError("root.server", { message: errorMessage(result.error) });
      return;
    }
    onStatus(t("success"));
    form.reset({ declaredBalanceCents: "", observation: "" });
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
          <p className="text-sm text-slate-700">
            {t("serverCash")} <strong>{formatCurrency(theoreticalCashCents)}</strong>
          </p>
          <Field
            htmlFor="declared-cash"
            label={t("balance")}
            error={validationMessage(errors.declaredBalanceCents?.message)}
          >
            <Input
              id="declared-cash"
              type="text"
              inputMode="decimal"
              {...form.register("declaredBalanceCents")}
              aria-invalid={Boolean(errors.declaredBalanceCents)}
              aria-describedby={errors.declaredBalanceCents ? "declared-cash-error" : undefined}
            />
          </Field>
          {difference !== null && (
            <p className="text-sm text-slate-600">
              {t("difference", { amount: formatCurrency(difference) })}
            </p>
          )}
          <Field
            htmlFor="close-observation"
            label={
              difference !== null && difference !== 0
                ? t("requiredObservation")
                : t("optionalObservation")
            }
            error={validationMessage(errors.observation?.message)}
          >
            <Input
              id="close-observation"
              {...form.register("observation")}
              aria-invalid={Boolean(errors.observation)}
              aria-describedby={errors.observation ? "close-observation-error" : undefined}
            />
          </Field>
          {errors.root?.server?.message && (
            <p role="alert" className="text-danger text-sm">
              {errors.root.server.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || sessionQuery.data?.status !== "open"}
            >
              {form.formState.isSubmitting ? t("submitting") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
