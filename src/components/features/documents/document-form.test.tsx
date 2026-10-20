import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DocumentForm } from "@/components/features/documents/document-form";
import { renderWithIntl } from "@/test/render-with-intl";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/data/mutations", () => ({
  useDocumentMutations: () => ({ create: vi.fn() }),
}));
vi.mock("@/components/common/customer-picker", () => ({
  CustomerPicker: ({ id }: { id: string }) =>
    createElement("input", { id, "aria-label": "Buscar cliente por nombre, documento o contacto" }),
}));

describe("DocumentForm customer selection", () => {
  it("uses the searchable customer picker for the document customer field", () => {
    const markup = renderWithIntl(createElement(DocumentForm));
    expect(markup).toContain('id="document-customer"');
    expect(markup).toContain("Buscar cliente por nombre, documento o contacto");
    expect(markup).not.toContain("Seleccioná un cliente");
  });
});
