import { describe, expect, it, vi } from "vitest";
import { AppSidebarContent } from "@/components/features/dashboard/app-sidebar";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({
  useActiveCompany: () => ({ data: { name: "Operia" } }),
  useCan: (permission: string) => can(permission),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/clientes" }));

describe("AppSidebar permissions", () => {
  it("shows only Clientes for a customer read-only role", () => {
    can.mockImplementation((permission: string) => permission === "customers.read");
    const markup = renderWithIntl(<AppSidebarContent />);
    expect(markup).toContain("Clientes");
    expect(markup).not.toContain(">Panel</a>");
    expect(markup).not.toContain(">Productos</a>");
    expect(markup).not.toContain(">Inventario</a>");
    expect(markup).not.toContain(">Comprobantes</a>");
    expect(markup).not.toContain(">Caja</a>");
    expect(markup).not.toContain(">Usuarios</a>");
  });

  it("shows every navigation item for ADMIN", () => {
    can.mockReturnValue(true);
    const markup = renderWithIntl(<AppSidebarContent />);
    for (const label of [
      "Inicio",
      "Clientes",
      "Productos",
      "Inventario",
      "Comprobantes",
      "Caja",
      "Usuarios",
    ])
      expect(markup).toContain(`>${label}</a>`);
  });
});
