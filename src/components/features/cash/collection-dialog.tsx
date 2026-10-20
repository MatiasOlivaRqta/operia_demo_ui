"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { Field } from "@/components/forms/field";
import { CustomerPicker } from "@/components/common/customer-picker";
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
import { useCan, useCashSession, useCustomerAccount } from "@/data/queries";
import {
  collectionDefaultsFor,
  createResetIdempotencyState,
  didFingerprintChange,
  mapFieldErrorsToFields,
} from "@/features/cash/dialog-logic";
import { collectPaymentSchema, type CollectPaymentValues } from "@/features/cash/schemas";
import { useFormatters } from "@/lib/use-formatters";
import type { Customer } from "@/features/customers/types";
import { asCents, parsePesosToCents } from "@/lib/money";
import { useValidationMessage } from "@/lib/use-validation-message";
import { useErrorMessage } from "@/lib/use-error-message";

type CollectionInput = z.input<typeof collectPaymentSchema>;
type CollectionDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onStatus: (message: string, kind?: "success" | "conflict") => void;
  onCollected?: () => void;
  customer?: Pick<Customer, "id" | "commercialName">;
}>;
type IdempotencyState = { fingerprint: string | null; key: string };

export function CollectionDialog({
  open,
  onClose,
  onStatus,
  onCollected,
  customer,
}: CollectionDialogProps) {
  const t = useTranslations("cash.collection");
  const canWriteCash = useCan("cash.write");
  const validationMessage = useValidationMessage();
  const errorMessage = useErrorMessage();
  const { currency: formatCurrency } = useFormatters();
  const mutations = useCashMutations();
  const sessionQuery = useCashSession();
  const [requestError, setRequestError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const submitLock = useRef(false);
  const idempotency = useRef<IdempotencyState>({ fingerprint: null, key: crypto.randomUUID() });
  const form = useForm<CollectionInput, undefined, CollectPaymentValues>({
    defaultValues: collectionDefaultsFor(customer?.id),
    resolver: zodResolver(collectPaymentSchema),
  });
  const errors = form.formState.errors;
  const customerId = useWatch({ control: form.control, name: "customerId" }) ?? "";
  const documentId = useWatch({ control: form.control, name: "documentId" }) ?? "";
  const amountText = useWatch({ control: form.control, name: "amountCents" }) ?? "";
  const amountCents = parsePesosToCents(amountText);
  const accountQuery = useCustomerAccount(customerId, { enabled: open });
  const account = accountQuery.data;
  const accountCustomer = customer ?? selectedCustomer;
  const selectedDocument = account?.pending.items.find((item) => item.id === documentId);
  const applicableCents = selectedDocument?.pendingCents ?? account?.debtCents;
  const estimatedCreditCents =
    amountCents !== null && applicableCents !== undefined && amountCents > applicableCents
      ? asCents(amountCents - applicableCents)
      : asCents(0);
  const wasOpen = useRef(open);

  const resetForClose = useCallback((): void => {
    form.reset(collectionDefaultsFor(customer?.id));
    setSelectedCustomer(null);
    setRequestError("");
    idempotency.current = createResetIdempotencyState(crypto.randomUUID());
  }, [customer?.id, form]);

  const handleClose = useCallback((): void => {
    wasOpen.current = false;
    resetForClose();
    onClose();
  }, [onClose, resetForClose]);

  useEffect(() => {
    if (wasOpen.current && !open) handleClose();
    wasOpen.current = open;
  }, [open, handleClose]);

  async function onSubmit(values: CollectPaymentValues): Promise<void> {
    const session = sessionQuery.data;
    if (!session || session.status !== "open") {
      setRequestError(t("closed"));
      handleClose();
      return;
    }
    setRequestError("");
    const fingerprint = `${values.customerId}|${values.documentId ?? ""}|${values.amountCents}|${values.paymentMethod}`;
    if (didFingerprintChange(idempotency.current.fingerprint, fingerprint)) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() };
    }
    const result = await mutations.collectPayment(session.id, values, idempotency.current.key);
    if (!result.ok) {
      if (result.error.code === "validation") {
        const fieldErrors = mapFieldErrorsToFields(result.error.fieldErrors, [
          "amountCents",
          "customerId",
          "documentId",
          "paymentMethod",
        ] as const);
        const fields = Object.entries(fieldErrors) as [FieldPath<CollectionInput>, string][];
        for (const [field, message] of fields) form.setError(field, { message, type: "server" });
        if (fields[0]) form.setFocus(fields[0][0]);
      } else if (result.error.code === "business_rule") {
        form.setError("amountCents", {
          message: errorMessage(result.error),
          type: "server",
        });
        form.setFocus("amountCents");
      } else if (result.error.code === "conflict") {
        onStatus(t("conflict"), "conflict");
        handleClose();
      } else {
        setRequestError(errorMessage(result.error));
      }
      return;
    }
    const creditMessage =
      result.value.creditGeneratedCents > 0
        ? t("creditGenerated", { amount: formatCurrency(result.value.creditGeneratedCents) })
        : "";
    onStatus(t("success", { number: result.value.receiptNumber, creditMessage }));
    onCollected?.();
    handleClose();
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

  if (!canWriteCash) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {customer ? t("descriptionFixed") : t("description")}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submitForm} className="grid gap-4">
          <Field
            htmlFor={customer ? "collection-customer-name" : "collection-customer"}
            label={t("customer")}
            error={validationMessage(errors.customerId?.message)}
          >
            {customer ? (
              <input
                id="collection-customer-name"
                className="border-input h-8 w-full rounded-lg border bg-slate-50 px-2.5 py-1 text-base text-slate-700 md:text-sm"
                value={customer.commercialName}
                readOnly
                aria-readonly="true"
              />
            ) : (
              <CustomerPicker
                id="collection-customer"
                value={selectedCustomer}
                onSelect={(selected) => {
                  setSelectedCustomer(selected);
                  form.setValue("customerId", selected.id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  form.setValue("documentId", "", { shouldDirty: true });
                  setRequestError("");
                }}
                ariaInvalid={Boolean(errors.customerId)}
                ariaDescribedBy={errors.customerId ? "collection-customer-error" : undefined}
              />
            )}
          </Field>
          {accountCustomer && account && (
            <section
              aria-label={t("accountLabel", { name: accountCustomer.commercialName })}
              className="grid gap-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
            >
              <p>
                {t("debt")} <strong>{formatCurrency(account.debtCents)}</strong>
              </p>
              <p>
                {t("credit")} <strong>{formatCurrency(account.creditCents)}</strong>
              </p>
            </section>
          )}
          {accountCustomer && accountQuery.isLoading && (
            <p role="status" className="text-sm text-slate-600">
              {t("loadingAccount")}
            </p>
          )}
          {accountCustomer && accountQuery.error && (
            <div
              role="alert"
              className="text-danger flex items-center justify-between gap-3 text-sm"
            >
              <p>{t("accountError")}</p>
              <Button type="button" variant="outline" onClick={() => void accountQuery.refetch()}>
                {t("retry")}
              </Button>
            </div>
          )}
          {account && (
            <>
              <Field
                htmlFor="collection-document"
                label={t("allocation")}
                error={validationMessage(errors.documentId?.message)}
              >
                <select
                  id="collection-document"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  {...form.register("documentId")}
                  aria-invalid={Boolean(errors.documentId)}
                  aria-describedby={errors.documentId ? "collection-document-error" : undefined}
                >
                  <option value="">{t("account")}</option>
                  {account.pending.items.map((document) => (
                    <option key={document.id} value={document.id}>
                      {t("documentOption", {
                        number: document.internalNumber,
                        amount: formatCurrency(document.pendingCents),
                      })}
                    </option>
                  ))}
                </select>
              </Field>
              {account.pending.total > account.pending.items.length && (
                <p className="text-sm text-amber-800" role="status">
                  {t("pendingLimit")}
                </p>
              )}
            </>
          )}
          <div className="grid gap-4">
            <Field
              htmlFor="collection-amount"
              label={t("amount")}
              error={validationMessage(errors.amountCents?.message)}
            >
              <Input
                id="collection-amount"
                type="text"
                inputMode="decimal"
                {...form.register("amountCents")}
                aria-invalid={Boolean(errors.amountCents)}
                aria-describedby={errors.amountCents ? "collection-amount-error" : undefined}
              />
            </Field>
            <Field
              htmlFor="collection-method"
              label={t("paymentMethod")}
              error={validationMessage(errors.paymentMethod?.message)}
            >
              <div
                id="collection-method"
                role="radiogroup"
                aria-label={t("paymentMethod")}
                aria-invalid={Boolean(errors.paymentMethod)}
                aria-describedby={errors.paymentMethod ? "collection-method-error" : undefined}
                className="grid min-h-11 grid-cols-3 rounded-md border border-slate-300 bg-white p-1"
              >
                {(["Efectivo", "Transferencia", "Tarjeta"] as const).map((method) => {
                  return (
                    <label
                      key={method}
                      className="flex min-h-11 cursor-pointer items-center justify-center rounded px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 has-[:checked]:bg-slate-900 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-900"
                    >
                      <input
                        type="radio"
                        value={method}
                        className="sr-only"
                        {...form.register("paymentMethod")}
                      />
                      {method === "Efectivo"
                        ? t("cash")
                        : method === "Transferencia"
                          ? t("transfer")
                          : t("card")}
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
          {estimatedCreditCents > 0 && (
            <p className="text-sm text-emerald-800" role="status">
              {t("excess", { amount: formatCurrency(estimatedCreditCents) })}
            </p>
          )}
          {requestError && (
            <p role="alert" className="text-danger text-sm">
              {requestError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                !sessionQuery.data ||
                sessionQuery.data.status !== "open" ||
                (Boolean(customerId) && !account)
              }
            >
              {form.formState.isSubmitting ? t("submitting") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
