"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { useMessages, useTranslations } from "next-intl";
import type { ManagedRole, PermissionGroup } from "@/data/api";
import { useRoleMutations } from "@/data/mutations";
import { usePermissionCatalog } from "@/data/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { managedRoleSchema, type ManagedRoleFormValues } from "@/features/users/schemas";

type RoleFormDialogProps = Readonly<{
  role?: ManagedRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

const emptyValues: ManagedRoleFormValues = { name: "", permissions: [] };

function findTranslation(messages: unknown, key: string): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function moduleIsChecked(
  group: PermissionGroup,
  selected: readonly string[],
): boolean | "indeterminate" {
  const count = group.permissions.filter((permission) => selected.includes(permission)).length;
  if (count === group.permissions.length && count > 0) return true;
  return count > 0 ? "indeterminate" : false;
}

function toggleModule(
  group: PermissionGroup,
  selected: readonly string[],
  checked: boolean,
): string[] {
  const groupPermissions = new Set(group.permissions);
  const remaining = selected.filter((permission) => !groupPermissions.has(permission));
  return checked ? [...remaining, ...group.permissions] : remaining;
}

export function RoleFormDialog({ role, open, onOpenChange }: RoleFormDialogProps) {
  const t = useTranslations("users");
  const validationMessage = useValidationMessage();
  const getErrorMessage = useErrorMessage();
  const mutations = useRoleMutations();
  const catalog = usePermissionCatalog();
  const messages = useMessages();
  const [mutationError, setMutationError] = useState("");
  const form = useForm<ManagedRoleFormValues>({
    defaultValues: role ? { name: role.name, permissions: [...role.permissions] } : emptyValues,
    resolver: zodResolver(managedRoleSchema),
  });
  const selectedPermissions = useWatch({ control: form.control, name: "permissions" }) ?? [];
  const errors = form.formState.errors;

  async function onSubmit(values: ManagedRoleFormValues): Promise<void> {
    const result = role ? await mutations.update(role.id, values) : await mutations.create(values);
    if (!result.ok) {
      const fieldErrors = Object.entries(result.error.fieldErrors ?? {}).filter(
        ([field]) => field in managedRoleSchema.shape,
      );
      for (const [field, message] of fieldErrors) {
        form.setError(field as FieldPath<ManagedRoleFormValues>, { message, type: "server" });
      }
      if (fieldErrors[0]) form.setFocus(fieldErrors[0][0] as FieldPath<ManagedRoleFormValues>);
      setMutationError(getErrorMessage(result.error));
      return;
    }
    onOpenChange(false);
  }

  function permissionLabel(permission: string): string {
    return findTranslation(messages, `permissions.${permission}`) ?? permission;
  }

  function moduleLabel(module: string): string {
    return findTranslation(messages, `permissions.${module}`) ?? module;
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      form.reset(role ? { name: role.name, permissions: [...role.permissions] } : emptyValues);
      setMutationError("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? t("editRole") : t("newRole")}</DialogTitle>
          <DialogDescription>{t("roleFormDescription")}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Field
            htmlFor="role-name"
            label={t("name")}
            error={validationMessage(errors.name?.message)}
          >
            <Input
              id="role-name"
              autoComplete="off"
              {...form.register("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "role-name-error" : undefined}
            />
          </Field>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{t("permissionsLabel")}</legend>
            {errors.permissions?.message && (
              <p id="permissions-error" role="alert" className="text-danger text-sm">
                {validationMessage(errors.permissions.message)}
              </p>
            )}
            {catalog.isLoading ? (
              <p role="status">{t("loadingPermissions")}</p>
            ) : catalog.error ? (
              <p role="alert" className="text-danger text-sm">
                {getErrorMessage(catalog.error)}
              </p>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border p-3">
                {catalog.data.map((group) => (
                  <section
                    key={group.module}
                    className="space-y-2 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <label className="flex items-center gap-2 font-medium">
                      <Checkbox
                        checked={moduleIsChecked(group, selectedPermissions) === true}
                        indeterminate={
                          moduleIsChecked(group, selectedPermissions) === "indeterminate"
                        }
                        onCheckedChange={(checked) =>
                          form.setValue(
                            "permissions",
                            toggleModule(group, selectedPermissions, checked === true),
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                        aria-label={t("toggleModule", { module: moduleLabel(group.module) })}
                      />
                      {moduleLabel(group.module)}
                    </label>
                    <div className="grid gap-2 pl-6 sm:grid-cols-2">
                      {group.permissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...new Set([...selectedPermissions, permission])]
                                : selectedPermissions.filter((item) => item !== permission);
                              form.setValue("permissions", next, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                          {permissionLabel(permission)}
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </fieldset>
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
              disabled={form.formState.isSubmitting || catalog.isLoading || Boolean(catalog.error)}
            >
              {form.formState.isSubmitting ? t("saving") : t("saveRole")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
