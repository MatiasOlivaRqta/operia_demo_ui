import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  cookies: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { loginDemo, setLanguage } from "./actions";

describe("setLanguage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ set: mocks.set });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["es", "en"] as const)(
    "persists %s for one year and refreshes the route",
    async (locale) => {
      await setLanguage(locale);
      expect(mocks.set).toHaveBeenCalledWith("operia_lang", locale, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        secure: expect.any(Boolean),
      });
      expect(mocks.refresh).toHaveBeenCalledOnce();
    },
  );

  it("rejects unsupported locale values without changing the cookie", async () => {
    await expect(setLanguage("fr")).rejects.toThrow("Unsupported language");
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("loginDemo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ set: mocks.set });
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("redirects production demo logins without setting a cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const formData = new FormData();
    formData.set("email", "demo@example.com");
    formData.set("password", "demo");

    await expect(loginDemo(formData)).rejects.toThrow("REDIRECT:/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("continues creating the demo cookie in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const formData = new FormData();
    formData.set("email", "demo@example.com");
    formData.set("password", "demo");

    await expect(loginDemo(formData)).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.set).toHaveBeenCalledWith("operia-demo", "active", expect.any(Object));
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
