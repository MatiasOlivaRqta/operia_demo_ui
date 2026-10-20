import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { useTranslations } from "next-intl";
import { renderWithIntl } from "./render-with-intl";

function Example() {
  const t = useTranslations("common");
  return createElement("span", null, t("save"));
}

describe("renderWithIntl", () => {
  it("renders the default Spanish locale", () => {
    expect(renderWithIntl(createElement(Example))).toContain("Guardar");
  });

  it("renders English when requested", () => {
    expect(renderWithIntl(createElement(Example), "en")).toContain("Save");
  });
});
