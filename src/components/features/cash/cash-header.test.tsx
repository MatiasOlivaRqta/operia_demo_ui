import { describe, expect, it, vi } from "vitest";
import { CashHeader } from "@/components/features/cash/cash-header";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({ useCan: (permission: string) => can(permission) }));

describe("CashHeader permissions", () => {
  it("hides open, collect and close actions without cash.write", () => {
    can.mockReturnValue(false);
    const markup = renderWithIntl(
      <CashHeader onClose={vi.fn()} onCollect={vi.fn()} onOpen={vi.fn()} session={undefined} />,
    );
    expect(markup).not.toContain("Abrir caja");
    expect(markup).not.toContain("Registrar cobro");
    expect(markup).not.toContain("Cerrar caja");
  });

  it("shows the available cash action for ADMIN", () => {
    can.mockReturnValue(true);
    const markup = renderWithIntl(
      <CashHeader onClose={vi.fn()} onCollect={vi.fn()} onOpen={vi.fn()} session={undefined} />,
    );
    expect(markup).toContain("Apertura");
  });
});
