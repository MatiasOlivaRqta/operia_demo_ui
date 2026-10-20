import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocale: vi.fn(async () => "es"),
  getMessages: vi.fn(async () => ({})),
  getTranslations: vi.fn(async () => (key: string) => `${key}-translated`),
}));

vi.mock("next-intl/server", () => mocks);
vi.mock("@/components/auth-redirect", () => ({ AuthRedirect: () => null }));

import RootLayout, { generateMetadata } from "./layout";

describe("RootLayout internationalization", () => {
  beforeEach(() => {
    mocks.getMessages.mockResolvedValue({});
    mocks.getTranslations.mockResolvedValue((key: string) => `${key}-translated`);
  });

  it.each(["es", "en"] as const)("declares the active %s language", async (locale) => {
    mocks.getLocale.mockResolvedValue(locale);
    // The test supplies the route child that Next.js normally provides to the root layout.
    const markup = renderToStaticMarkup(
      await RootLayout({ children: createElement("main"), params: Promise.resolve({}) }),
    );
    expect(markup).toContain(`<html lang="${locale}"`);
  });

  it("uses translated metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata).toEqual({ title: "title-translated", description: "description-translated" });
  });
});
