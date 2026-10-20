import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("uses a valid cookie before the browser header", () => {
    expect(resolveLocale("en", "es-AR,es;q=0.9")).toBe("en");
    expect(resolveLocale("es", "en-US,en;q=0.9")).toBe("es");
  });

  it("ignores an unsupported cookie and resolves the supported browser language", () => {
    expect(resolveLocale("fr", "en-US,en;q=0.9")).toBe("en");
  });

  it("accepts a regional English header", () => {
    expect(resolveLocale(undefined, "en-US,en;q=0.9")).toBe("en");
  });

  it("falls back to Spanish for unsupported or missing preferences", () => {
    expect(resolveLocale(undefined, "fr-FR,fr;q=0.9")).toBe("es");
    expect(resolveLocale()).toBe("es");
  });

  it("honors quality values when finding the first supported language", () => {
    expect(resolveLocale(undefined, "fr;q=1,en-US;q=0.8,es;q=0.5")).toBe("en");
    expect(resolveLocale(undefined, "en;q=0,es;q=0.5")).toBe("es");
  });
});
