import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/data/config", () => ({ dataSource: "local" }));

import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function getForwardedHeader(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy security headers", () => {
  it("forwards a unique nonce and CSP on page requests", () => {
    const first = proxy(request("/public"));
    const second = proxy(request("/public"));
    const firstNonce = getForwardedHeader(first, "x-nonce");
    const firstCsp = getForwardedHeader(first, "content-security-policy");

    expect(firstNonce).toBeTruthy();
    expect(firstNonce).not.toBe(getForwardedHeader(second, "x-nonce"));
    expect(first.headers.get("Content-Security-Policy")).toBe(firstCsp);
    expect(first.headers.get("Content-Security-Policy")).toContain(`'nonce-${firstNonce}'`);
    expect(firstCsp).toContain("'unsafe-eval'");
  });

  it("sets the CSP on redirects and keeps the protected route behavior", () => {
    const protectedRedirect = proxy(request("/dashboard/reports"));
    const publicPage = proxy(request("/clientes-publicos"));

    expect(protectedRedirect.status).toBe(307);
    expect(protectedRedirect.headers.get("location")).toBe("http://localhost/login");
    expect(protectedRedirect.headers.get("Content-Security-Policy")).toContain("'nonce-");
    expect(protectedRedirect.headers.get("x-nonce")).toBeTruthy();
    expect(publicPage.status).toBe(200);
  });

  it("omits unsafe-eval in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = proxy(request("/login"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    expect(response.status).toBe(200);
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("redirects a signed-in user away from login", () => {
    const response = proxy(request("/login", "operia-demo=active"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(response.headers.get("Content-Security-Policy")).toContain("'nonce-");
  });
});
