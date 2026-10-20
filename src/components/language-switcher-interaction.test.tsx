import { createElement, type ElementType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";

const mocks = vi.hoisted(() => ({
  locale: "es" as string,
  buttons: [] as Record<string, unknown>[],
  setLanguage: vi.fn(async (locale: string) => {
    mocks.locale = locale;
  }),
  startTransition: vi.fn((callback: () => void) => callback()),
}));

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useLocale: () => mocks.locale,
  useTranslations: () => (key: string) =>
    ({ label: "Idioma", spanish: "Español", english: "Inglés" })[key],
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useTransition: () => [false, mocks.startTransition],
}));
vi.mock("react/jsx-runtime", async (importOriginal) => {
  const runtime = await importOriginal<typeof import("react/jsx-runtime")>();
  const captureButton = (type: unknown, props: Record<string, unknown>) => {
    if (type === "button") mocks.buttons.push(props);
  };

  return {
    ...runtime,
    jsx: (type: unknown, props: Record<string, unknown>, key?: string) => {
      captureButton(type, props);
      return runtime.jsx(type as ElementType, props, key);
    },
    jsxs: (type: unknown, props: Record<string, unknown>, key?: string) => {
      captureButton(type, props);
      return runtime.jsxs(type as ElementType, props, key);
    },
  };
});
vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const runtime = await importOriginal<typeof import("react/jsx-dev-runtime")>();

  return {
    ...runtime,
    jsxDEV: (
      type: unknown,
      props: Record<string, unknown>,
      key: string | undefined,
      isStaticChildren: boolean,
      source: Parameters<typeof runtime.jsxDEV>[4],
      self: Parameters<typeof runtime.jsxDEV>[5],
    ) => {
      if (type === "button") mocks.buttons.push(props);
      return runtime.jsxDEV(type as ElementType, props, key, isStaticChildren, source, self);
    },
  };
});
vi.mock("@/app/actions", () => ({ setLanguage: mocks.setLanguage }));

import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher interaction", () => {
  beforeEach(() => {
    mocks.locale = "es";
    mocks.buttons.length = 0;
    mocks.setLanguage.mockClear();
  });

  it("calls the language action when English is selected and marks it active", () => {
    renderWithIntl(createElement(LanguageSwitcher));
    const englishButton = mocks.buttons.find((button) => button["aria-pressed"] === false);

    (englishButton?.onClick as (() => void) | undefined)?.();
    expect(mocks.setLanguage).toHaveBeenCalledWith("en");

    const markup = renderWithIntl(createElement(LanguageSwitcher), "en");
    expect(markup).toMatch(
      /aria-label="Inglés"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Inglés"/,
    );
  });
});
