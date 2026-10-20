"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoleMutations, useUserMutations } from "@/data/mutations";
import { usePermissionCatalog, useRoles, useUsers } from "@/data/queries";
import type { ManagedRole, ManagedUser } from "@/data/api";
import { useErrorMessage } from "@/lib/use-error-message";
import type { AppError } from "@/lib/result";
import { useTranslations } from "next-intl";
import { RoleFormDialog } from "@/components/features/users/role-form-dialog";
import { UserFormDialog } from "@/components/features/users/user-form-dialog";

type ConfirmationProps = {
  kind: "user" | "role";
  id: string;
  name: string;
  onConfirm: (id: string) => Promise<{ ok: boolean; error?: AppError }>;
};

function RemoveConfirmation({ kind, id, name, onConfirm }: ConfirmationProps) {
  const t = useTranslations("users");
  const getErrorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [saving, setSaving] = useState(false);
  const title = kind === "user" ? t("removeUser") : t("deleteRole");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {title}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "user" ? t("confirmUserTitle") : t("confirmRoleTitle")}
          </DialogTitle>
          <DialogDescription>
            {kind === "user"
              ? t("confirmUserDescription", { name })
              : t("confirmRoleDescription", { name })}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {getErrorMessage(error)}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("cancel")}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const result = await onConfirm(id);
              setSaving(false);
              if (!result.ok) {
                setError(result.error ?? null);
                return;
              }
              setOpen(false);
            }}
          >
            {saving ? t("loading") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTable({
  users,
  roles,
}: {
  users: readonly ManagedUser[];
  roles: readonly ManagedRole[];
}) {
  const t = useTranslations("users");
  const getErrorMessage = useErrorMessage();
  const mutations = useUserMutations();
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  return (
    <Table aria-label={t("usersTable")}>
      <TableHeader>
        <TableRow>
          <TableHead>{t("email")}</TableHead>
          <TableHead>{t("name")}</TableHead>
          <TableHead>{t("role")}</TableHead>
          <TableHead>{t("changeRole")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5}>{t("emptyUsers")}</TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.role.name}</TableCell>
              <TableCell>
                <select
                  aria-label={t("changeRoleFor", { name: user.name })}
                  className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={user.role.id}
                  onChange={async (event) => {
                    setRowErrors((current) => ({ ...current, [user.id]: "" }));
                    const result = await mutations.update(user.id, { roleId: event.target.value });
                    if (!result.ok) {
                      setRowErrors((current) => ({
                        ...current,
                        [user.id]: getErrorMessage(result.error),
                      }));
                    }
                  }}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {rowErrors[user.id] && (
                  <p role="alert" className="text-danger mt-1 text-xs">
                    {rowErrors[user.id]}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <RemoveConfirmation
                  kind="user"
                  id={user.id}
                  name={user.name}
                  onConfirm={mutations.delete}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function RolesTable({
  roles,
  onEdit,
}: {
  roles: readonly ManagedRole[];
  onEdit: (role: ManagedRole) => void;
}) {
  const t = useTranslations("users");
  const tr = useTranslations("roles");
  const mutations = useRoleMutations();
  const getErrorMessage = useErrorMessage();
  const catalog = usePermissionCatalog();
  const catalogError = catalog.error ? getErrorMessage(catalog.error) : "";
  return (
    <>
      {catalogError && (
        <p role="alert" className="mb-3 text-sm text-rose-700">
          {catalogError}
        </p>
      )}
      <Table aria-label={t("rolesTable")}>
        <TableHeader>
          <TableRow>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{t("userCount")}</TableHead>
            <TableHead>{t("systemRole")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>{t("emptyRoles")}</TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <p className="font-medium">{role.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1" aria-label={t("permission")}>
                    {role.permissions.map((permission) => {
                      const [, action] = permission.split(".");
                      return (
                        <Badge key={permission} variant="secondary">
                          {tr(action as never)}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>{role.userCount}</TableCell>
                <TableCell>{role.isSystem ? t("system") : "—"}</TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Button type="button" variant="outline" disabled title={t("deleteDisabled")}>
                      {t("deleteRole")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => onEdit(role)}>
                        {t("editRoleAction")}
                      </Button>
                      <RemoveConfirmation
                        kind="role"
                        id={role.id}
                        name={role.name}
                        onConfirm={mutations.delete}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {catalog.data.length > 0 && (
        <p className="sr-only">
          {catalog.data
            .map((group) => `${tr(group.module as never)}: ${group.permissions.length}`)
            .join("; ")}
        </p>
      )}
    </>
  );
}

export function UsersManagement() {
  const t = useTranslations("users");
  const getErrorMessage = useErrorMessage();
  const users = useUsers();
  const roles = useRoles();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userFormKey, setUserFormKey] = useState(0);
  const [roleDialog, setRoleDialog] = useState<ManagedRole | null | undefined>(undefined);
  const [roleFormKey, setRoleFormKey] = useState(0);
  const error = users.error ?? roles.error;
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8"
    >
      <div>
        <p className="text-sm text-slate-500">{t("operation")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{t("description")}</p>
      </div>
      {users.isLoading || roles.isLoading ? (
        <p className="mt-8" role="status">
          {t("loading")}
        </p>
      ) : error ? (
        <p className="mt-8 text-sm text-rose-700" role="alert">
          {getErrorMessage(error) || t("loadError")}
        </p>
      ) : (
        <Tabs defaultValue="users" className="mt-8">
          <TabsList>
            <TabsTrigger value="users">{t("usersTab")}</TabsTrigger>
            <TabsTrigger value="roles">{t("rolesTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setUserFormKey((key) => key + 1);
                  setUserDialogOpen(true);
                }}
              >
                {t("newUser")}
              </Button>
            </div>
            <UsersTable users={users.data} roles={roles.data} />
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setRoleFormKey((key) => key + 1);
                  setRoleDialog(null);
                }}
              >
                {t("newRole")}
              </Button>
            </div>
            <RolesTable roles={roles.data} onEdit={setRoleDialog} />
          </TabsContent>
        </Tabs>
      )}
      <UserFormDialog key={userFormKey} open={userDialogOpen} onOpenChange={setUserDialogOpen} />
      <RoleFormDialog
        key={roleDialog?.id ?? `new-role-${roleFormKey}`}
        role={roleDialog ?? undefined}
        open={roleDialog !== undefined}
        onOpenChange={(open) => {
          if (!open) setRoleDialog(undefined);
        }}
      />
    </main>
  );
}
