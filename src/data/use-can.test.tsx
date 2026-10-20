import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/features/auth/schemas";

vi.mock("@/data/config", () => ({ dataSource: "api" }));
vi.mock("@/data/context", () => ({
  useDataContext: () => ({
    api: {},
    snapshot: { activeCompanyId: "company-1", companies: [] },
  }),
}));

const { useCan } = await import("@/data/queries");

function CanResult({ permissions }: Readonly<{ permissions: string[] }>) {
  return createElement("span", null, String(useCan(...permissions)));
}

function renderCan(permissions: string[], session?: AuthSession): string {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (session) queryClient.setQueryData(["auth-session"], session);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CanResult, { permissions }),
    ),
  );
}

const session: AuthSession = {
  user: { id: "user-1", email: "user@example.com", name: "User" },
  companies: [{ id: "company-1", legalName: "Operia SA", name: "Operia" }],
  activeCompany: { id: "company-1", legalName: "Operia SA", name: "Operia" },
  role: { id: "role-1", name: "Facturación" },
  permissions: ["documents.read", "documents.write"],
};

describe("useCan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the session has a requested permission", () => {
    expect(renderCan(["documents.write"], session)).toContain(">true</span>");
  });

  it("returns false when the session lacks the requested permission", () => {
    expect(renderCan(["cash.read"], session)).toContain(">false</span>");
  });

  it("returns true when any one of multiple requested permissions is present", () => {
    expect(renderCan(["cash.read", "documents.write"], session)).toContain(">true</span>");
    expect(renderCan(["cash.read", "users.manage"], session)).toContain(">false</span>");
  });

  it("returns false while the session is loading", () => {
    expect(renderCan(["documents.write"])).toContain(">false</span>");
  });
});
