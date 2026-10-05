import type { NextConfig } from "next";

// ============================================================================
// Security headers (Security Pass B).
//
// Applied to every response by Next.js. Values are intentionally compatible with
// the current architecture (Next 16 + React 19 inline hydration, Tailwind/inline
// styles, framer-motion inline styles, client-side PDF/DOCX parsing with blob:
// object URLs, and the browser Supabase client talking to *.supabase.co).
//
// CSP honesty: 'unsafe-inline' is required for script-src and style-src because
// this app relies on Next's inline hydration bootstrap and inline styles; it is
// NOT a nonce/strict-dynamic CSP. 'unsafe-eval' is allowed ONLY in development
// (React Refresh / dev tooling), never in production. This is documented rather
// than overstated. No wildcard default-src.
// ============================================================================

const isProd = process.env.NODE_ENV === "production";

// Supabase browser traffic (auth + REST + realtime websocket). The OpenAI/Jooble
// providers are called SERVER-side only, so they are intentionally NOT in
// connect-src (the browser never talks to them directly).
const SUPABASE = "https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // HSTS only in production (HTTPS). Harmless omission in dev/HTTP.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Security headers on every route.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Authenticated AI/provider API responses carry user-generated content —
        // never cache them in shared/browser caches.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
