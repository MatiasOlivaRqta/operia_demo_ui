import { describe, expect, it, vi } from "vitest";
import { DocumentConfirmAction } from "@/components/features/documents/document-confirm-action";
import { renderWithIntl } from "@/test/render-with-intl";

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/data/queries", () => ({ useCan: () => can("documents.cancel") }));
vi.mock("@/data/mutations", () => ({ useDocumentMutations: () => ({ cancel: vi.fn() }) }));

describe("DocumentConfirmAction permissions", () => {
  it("hides cancellation without documents.cancel", () => {
    can.mockReturnValue(false);
    expect(renderWithIntl(<DocumentConfirmAction documentId="document-1" mode="cancel" />)).toBe(
      "",
    );
  });

  it("shows cancellation only for permitted pending documents", () => {
    can.mockReturnValue(true);
    expect(
      renderWithIntl(
        <DocumentConfirmAction documentId="document-1" documentStatus="PENDING" mode="cancel" />,
      ),
    ).toContain("Anular");
    for (const status of ["PARTIAL", "COMPLETED"] as const) {
      expect(
        renderWithIntl(
          <DocumentConfirmAction documentId="document-1" documentStatus={status} mode="cancel" />,
        ),
      ).toBe("");
    }
  });
});
