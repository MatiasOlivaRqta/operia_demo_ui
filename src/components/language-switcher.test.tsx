import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";
import { renderWithIntl } from "@/test/render-with-intl";

describe("LanguageSwitcher", () => {
  it("shows Spanish as active by default", () => {
    const markup = renderWithIntl(createElement(LanguageSwitcher));
    expect(markup).toMatch(
      /aria-label="Español"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Español"/,
    );
    expect(markup).toContain(">ES</button>");
  });

  it("shows English as active in English and labels both choices", () => {
    const markup = renderWithIntl(createElement(LanguageSwitcher), "en");
    expect(markup).toContain('aria-label="Language"');
    expect(markup).toMatch(
      /aria-label="English"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="English"/,
    );
    expect(markup).toContain(">EN</button>");
  });
});
