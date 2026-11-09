import type { NextConfig } from "next";

const API_ORIGIN = process.env.SILA_API_ORIGIN ?? "http://localhost:4000";
const isProd = process.env.NODE_ENV === "production";

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    // Next.js currently requires unsafe-inline for its injected inline scripts
    // in production unless the nonce+middleware pattern is wired up. For the
    // prototype we allow self + inline scripts but keep every other source
    // locked down.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=()",
  },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
  async headers() {
    // Apply the strict headers to every page. HSTS is only meaningful over
    // HTTPS; browsers ignore it over HTTP, so emitting it in dev is
    // harmless.
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS.filter(
          (h) => isProd || h.key !== "Strict-Transport-Security",
        ),
      },
    ];
  },
};

export default nextConfig;
