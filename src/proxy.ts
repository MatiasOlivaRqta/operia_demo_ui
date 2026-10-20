import { NextResponse, type NextRequest } from "next/server";
import { dataSource } from "@/data/config";

const protectedRoots = [
  "/dashboard",
  "/clientes",
  "/productos",
  "/inventario",
  "/caja",
  "/comprobantes",
  "/usuarios",
];

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withSecurityHeaders = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);
    return response;
  };

  const { pathname } = request.nextUrl;
  const hasSession =
    dataSource === "api"
      ? Boolean(request.cookies.get("operia_session")?.value)
      : request.cookies.get("operia-demo")?.value === "active";
  const isProtected = protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );

  if (pathname === "/") {
    return withSecurityHeaders(
      NextResponse.redirect(new URL(hasSession ? "/dashboard" : "/login", request.url)),
    );
  }
  if (isProtected && !hasSession) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }
  if (pathname === "/login" && hasSession) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }
  return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
