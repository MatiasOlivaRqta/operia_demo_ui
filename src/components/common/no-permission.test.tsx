import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { NoPermission } from "@/components/common/no-permission";
import { renderWithIntl } from "@/test/render-with-intl";

describe("NoPermission", () => {
  it.each(["es", "en"] as const)("renders the %s message", (locale) => {
    const markup = renderWithIntl(createElement(NoPermission), locale);

    expect(markup).toContain(
      locale === "es"
        ? "No tenés permiso para ver esta página"
        : "You don’t have permission to view this page",
    );
    expect(markup).toContain(
      locale === "es"
        ? "Pedile acceso a una persona administradora de la empresa."
        : "Ask a company administrator to grant you access.",
    );
  });
});
