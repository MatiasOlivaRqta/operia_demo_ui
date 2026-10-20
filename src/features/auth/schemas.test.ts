import { describe, expect, it } from "vitest";
import { permissions } from "@/features/auth/permissions";
import type { AuthSession } from "@/features/auth/schemas";

describe("auth session and permission catalog", () => {
  it("includes the complete backend permission catalog", () => {
    expect(permissions).toHaveLength(16);
    expect(permissions).toEqual([
      "customers.read",
      "customers.write",
      "products.read",
      "products.write",
      "inventory.read",
      "inventory.write",
      "inventory.cancel",
      "documents.read",
      "documents.write",
      "documents.cancel",
      "cash.read",
      "cash.write",
      "account.read",
      "account.write",
      "dashboard.read",
      "users.manage",
    ]);
  });

  it("includes the active company role and permissions in a session", () => {
    const session: AuthSession = {
      user: { id: "user-1", email: "admin@example.com", name: "Admin" },
      companies: [{ id: "company-1", legalName: "Operia SA", name: "Operia" }],
      activeCompany: { id: "company-1", legalName: "Operia SA", name: "Operia" },
      role: { id: "role-admin", name: "ADMIN" },
      permissions,
    };

    expect(session.role.name).toBe("ADMIN");
    expect(session.permissions).toContain("users.manage");
  });
});
