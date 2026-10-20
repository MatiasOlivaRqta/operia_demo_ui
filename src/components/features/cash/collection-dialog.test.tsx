import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CollectionDialog } from "@/components/features/cash/collection-dialog";
import { renderWithIntl } from "@/test/render-with-intl";

vi.mock("@/data/mutations", () => ({
  useCashMutations: () => ({ collectPayment: vi.fn() }),
}));
vi.mock("@/data/queries", () => ({
  useCan: () => true,
  useCashSession: () => ({ data: undefined, error: null, isLoading: false }),
  useCustomerAccount: () => ({ data: undefined, error: null, isLoading: false }),
}));
vi.mock("@/components/common/customer-picker", () => ({
  CustomerPicker: ({ id }: { id: string }) =>
    createElement("input", { id, "aria-label": "Buscar cliente por nombre, documento o contacto" }),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement("p", null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    createElement("footer", null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement("header", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => createElement("h2", null, children),
}));

describe("CollectionDialog customer selection", () => {
  it("uses the searchable customer picker for the collection customer field", () => {
    const markup = renderWithIntl(
      createElement(CollectionDialog, {
        open: true,
        onClose: vi.fn(),
        onStatus: vi.fn(),
        onCollected: vi.fn(),
      }),
    );
    expect(markup).toContain('id="collection-customer"');
    expect(markup).toContain("Buscar cliente por nombre, documento o contacto");
    expect(markup).not.toContain("Seleccioná un cliente");
  });

  it("shows a fixed customer without rendering the search picker", () => {
    const markup = renderWithIntl(
      createElement(CollectionDialog, {
        open: true,
        onClose: vi.fn(),
        onStatus: vi.fn(),
        customer: { id: "customer-1", commercialName: "Ferretería Sur" },
      }),
    );
    expect(markup).toContain("Ferretería Sur");
    expect(markup).not.toContain('id="collection-customer"');
    expect(markup).not.toContain("Buscar cliente por nombre, documento o contacto");
    expect(markup).not.toContain("Elegí el cliente");
  });

  it("renders collection labels in English", () => {
    const markup = renderWithIntl(
      createElement(CollectionDialog, {
        open: true,
        onClose: vi.fn(),
        onStatus: vi.fn(),
      }),
      "en",
    );
    expect(markup).toContain("Record collection");
    expect(markup).toContain("Choose the customer, allocation, amount, and payment method.");
    expect(markup).toContain("Amount (ARS)");
    expect(markup).toContain("Payment method");
    expect(markup).toContain("Cash");
    expect(markup).toContain("Bank transfer");
    expect(markup).toContain("Card");
  });
});
