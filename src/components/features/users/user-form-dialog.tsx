"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useUserMutations } from "@/data/mutations";
import { useRoles } from "@/data/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/lib/use-error-message";
import { useValidationMessage } from "@/lib/use-validation-message";
import {
  createManagedUserSchema,
  type CreateManagedUserFormValues,
} from "@/features/users/schemas";

type UserFormDialogProps = Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>;

const emptyValues: CreateManagedUserFormValues = { email: "", name: "", password: "", roleId: "" };

export function UserFormDialog({ open, onOpenChange }: UserFormDialogProps) {
  const t = useTranslations("users");
  const validationMessage = useValidationMessage();
  const getErrorMessage = useErrorMessage();
  const mutations = useUserMutations();
  const roles = useRoles();
  const [mutationError, setMutationError] = useState("");
  const form = useForm<CreateManagedUserFormValues>({
    defaultValues: emptyValues,
    resolver: zodResolver(createManagedUserSchema),
  });
  const errors = form.formState.errors;

  async function onSubmit(values: CreateManagedUserFormValues): Promise<void> {
    const result = await mutations.create(values);
    if (!result.ok) {
      const fieldErrors = Object.entries(result.error.fieldErrors ?? {}).filter(
        ([field]) => field in createManagedUserSchema.shape,
      );
      for (const [field, message] of fieldErrors) {
        form.setError(field as FieldPath<CreateManagedUserFormValues>, { message, type: "server" });
      }
      if (fieldErrors[0])
        form.setFocus(fieldErrors[0][0] as FieldPath<CreateManagedUserFormValues>);
      setMutationError(getErrorMessage(result.error));
      return;
    }
    form.reset(emptyValues);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newUser")}</DialogTitle>
          <DialogDescription>{t("userFormDescription")}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field
            htmlFor="user-email"
            label={t("email")}
            error={validationMessage(errors.email?.message)}
          >
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "user-email-error" : undefined}
            />
          </Field>
          <Field
            htmlFor="user-name"
            label={t("name")}
            error={validationMessage(errors.name?.message)}
          >
            <Input
              id="user-name"
              autoComplete="name"
              {...form.register("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "user-name-error" : undefined}
            />
          </Field>
          <Field
            htmlFor="user-password"
            label={t("initialPassword")}
            description={t("passwordLengthHint")}
            error={validationMessage(errors.password?.message)}
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "user-password-error" : "user-password-description"
              }
            />
          </Field>
          <Field
            htmlFor="user-role"
            label={t("role")}
            error={validationMessage(errors.roleId?.message)}
          >
            <select
              id="user-role"
              className="min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...form.register("roleId")}
              aria-invalid={Boolean(errors.roleId)}
              aria-describedby={errors.roleId ? "user-role-error" : undefined}
              disabled={roles.isLoading || roles.data.length === 0}
            >
              <option value="">{t("chooseRole")}</option>
              {roles.data.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            {t("existingEmailNotice")}
          </p>
          {roles.error && (
            <p role="alert" className="text-danger text-sm">
              {getErrorMessage(roles.error)}
            </p>
          )}
          {mutationError && (
            <p role="alert" className="text-danger text-sm">
              {mutationError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || roles.isLoading || roles.data.length === 0}
            >
              {form.formState.isSubmitting ? t("saving") : t("createUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
