import { describe, expect, it, vi } from "vitest";
import { CustomerStatusDialog } from "@/components/features/customers/customer-status-dialog";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({ useCan: () => can("customers.write") }));
vi.mock("@/data/mutations", () => ({ useCustomerMutations: () => ({ setStatus: vi.fn() }) }));

describe("CustomerStatusDialog permissions", () => {
  const props = { customerId: "customer-1", customerName: "Cliente", status: "active" as const };

  it("hides the status action without customers.write", () => {
    can.mockReturnValue(false);
    expect(renderWithIntl(<CustomerStatusDialog {...props} />)).toBe("");
  });

  it("shows the status action for ADMIN", () => {
    can.mockReturnValue(true);
    expect(renderWithIntl(<CustomerStatusDialog {...props} />)).toContain("Dar de baja");
  });
});
