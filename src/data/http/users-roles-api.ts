import type {
  CreateManagedUserInput,
  ManagedRole,
  ManagedUser,
  PermissionGroup,
  RolesApi,
  SaveManagedRoleInput,
  UpdateManagedUserInput,
  UsersApi,
} from "@/data/api";
import { requestApi } from "@/data/http/client";

export const usersApi: UsersApi = {
  list: (control) => requestApi<readonly ManagedUser[]>("/users", { signal: control?.signal }),
  create: (input: CreateManagedUserInput) =>
    requestApi<ManagedUser>("/users", { method: "POST", body: input }),
  update: (id: string, input: UpdateManagedUserInput) =>
    requestApi<ManagedUser>(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
  delete: (id: string) =>
    requestApi<void>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const rolesApi: RolesApi = {
  list: (control) => requestApi<readonly ManagedRole[]>("/roles", { signal: control?.signal }),
  permissionCatalog: (control) =>
    requestApi<readonly PermissionGroup[]>("/roles/permissions", { signal: control?.signal }),
  create: (input: SaveManagedRoleInput) =>
    requestApi<ManagedRole>("/roles", { method: "POST", body: input }),
  update: (id: string, input: Partial<SaveManagedRoleInput>) =>
    requestApi<ManagedRole>(`/roles/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
  delete: (id: string) =>
    requestApi<void>(`/roles/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
