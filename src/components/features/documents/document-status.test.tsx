import { describe, expect, it } from "vitest";
import { DocumentStatusBadge } from "@/components/features/documents/document-status";
import { renderWithIntl } from "@/test/render-with-intl";

const labels = {
  es: ["Pendiente", "Parcial", "Completado", "Anulado"],
  en: ["Pending", "Partial", "Completed", "Voided"],
} as const;
const statuses = ["PENDING", "PARTIAL", "COMPLETED", "CANCELLED"] as const;

describe("document status badge", () => {
  it.each(["es", "en"] as const)("renders every status in %s", (locale) => {
    const markup = statuses
      .map((status) => renderWithIntl(<DocumentStatusBadge status={status} />, locale))
      .join(" ");

    for (const label of labels[locale]) expect(markup).toContain(label);
  });
});
