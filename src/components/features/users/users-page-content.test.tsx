import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { UsersPageContent } from "@/components/features/users/users-page-content";
import { renderWithIntl } from "@/test/render-with-intl";

const { can, useUsers, useRoles, usePermissionCatalog, deleteUser, deleteRole } = vi.hoisted(
  () => ({
    can: vi.fn(),
    useUsers: vi.fn(),
    useRoles: vi.fn(),
    usePermissionCatalog: vi.fn(),
    deleteUser: vi.fn(),
    deleteRole: vi.fn(),
  }),
);
vi.mock("@/data/queries", () => ({
  useCan: (permission: string) => can(permission),
  useUsers: () => useUsers(),
  useRoles: () => useRoles(),
  usePermissionCatalog: () => usePermissionCatalog(),
}));
vi.mock("@/data/mutations", () => ({
  useUserMutations: () => ({ delete: deleteUser }),
  useRoleMutations: () => ({ delete: deleteRole }),
}));

describe("UsersPageContent", () => {
  it("shows the no-permission view when users.manage is missing", () => {
    can.mockReturnValue(false);
    expect(renderWithIntl(createElement(UsersPageContent))).toContain("No tenés permiso");
    expect(can).toHaveBeenCalledWith("users.manage");
  });

  it("renders user management actions in Spanish and English", () => {
    can.mockReturnValue(true);
    useUsers.mockReturnValue({
      data: [
        { id: "u1", email: "ana@example.com", name: "Ana", role: { id: "r1", name: "ADMIN" } },
      ],
      error: null,
      isLoading: false,
    });
    useRoles.mockReturnValue({
      data: [
        { id: "r1", name: "ADMIN", isSystem: true, permissions: ["users.manage"], userCount: 1 },
      ],
      error: null,
      isLoading: false,
    });
    usePermissionCatalog.mockReturnValue({
      data: [{ module: "users", permissions: ["users.manage"] }],
      error: null,
      isLoading: false,
    });

    const spanish = renderWithIntl(createElement(UsersPageContent), "es");
    expect(spanish).toContain("Usuarios y roles");
    expect(spanish).toContain("ana@example.com");
    expect(spanish).toContain("ADMIN");
    expect(spanish).toContain("Nuevo usuario");
    expect(spanish).toContain("Cambiar el rol de Ana");

    const english = renderWithIntl(createElement(UsersPageContent), "en");
    expect(english).toContain("Users and roles");
    expect(english).toContain("ana@example.com");
    expect(english).toContain("Remove user");
    expect(english).toContain("Change Ana&#x27;s role");
  });
});
