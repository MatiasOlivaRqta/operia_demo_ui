import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGate } from "@/components/common/permission-gate";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AuthSession } from "@/features/auth/schemas";

const sessionState = vi.hoisted(() => ({
  session: undefined as AuthSession | undefined,
  isLoading: false,
}));

vi.mock("@/data/queries", () => ({
  useAuthSession: () => ({ data: sessionState.session, isLoading: sessionState.isLoading }),
  useCan: (...permissions: string[]) =>
    permissions.some((permission) => sessionState.session?.permissions.includes(permission)),
}));

const session: AuthSession = {
  user: { id: "user-1", email: "user@example.com", name: "User" },
  companies: [{ id: "company-1", legalName: "Operia SA", name: "Operia" }],
  activeCompany: { id: "company-1", legalName: "Operia SA", name: "Operia" },
  role: { id: "role-1", name: "Facturación" },
  permissions: ["documents.write"],
};

describe("PermissionGate", () => {
  beforeEach(() => {
    sessionState.session = session;
    sessionState.isLoading = false;
  });

  it.each(["es", "en"] as const)("shows the denied state in %s", (locale) => {
    sessionState.session = { ...session, permissions: [] };
    const markup = renderWithIntl(
      createElement(PermissionGate, { permissions: ["cash.read"] }, "Secret data"),
      locale,
    );

    expect(markup).not.toContain("Secret data");
    expect(markup).toContain(locale === "es" ? "No tenés permiso" : "You don’t have permission");
  });

  it("renders content only when the permission is present", () => {
    const markup = renderWithIntl(
      createElement(
        PermissionGate,
        {
          permissions: ["documents.read", "documents.write"],
        },
        "Document form",
      ),
    );

    expect(markup).toContain("Document form");
    expect(markup).not.toContain("No tenés permiso");
  });

  it("renders nothing while session permissions are loading", () => {
    sessionState.session = undefined;
    sessionState.isLoading = true;

    expect(
      renderWithIntl(createElement(PermissionGate, { permissions: ["cash.read"] }, "Secret data")),
    ).toBe("");
  });
});
