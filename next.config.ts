import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

if (process.env.NEXT_PUBLIC_DATA_SOURCE === "api" && !process.env.API_INTERNAL_URL) {
  throw new Error("API_INTERNAL_URL es obligatorio cuando NEXT_PUBLIC_DATA_SOURCE=api.");
}
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DATA_SOURCE !== "api") {
  throw new Error("NEXT_PUBLIC_DATA_SOURCE=api es obligatorio en producción.");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "api") return [];
    const apiUrl = process.env.API_INTERNAL_URL;
    if (!apiUrl) throw new Error("API_INTERNAL_URL es obligatorio en modo API.");
    return [{ source: "/api/:path*", destination: `${apiUrl.replace(/\/$/, "")}/:path*` }];
  },
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/(.*)", headers }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
