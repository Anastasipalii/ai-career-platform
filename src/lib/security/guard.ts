// ============================================================================
// security/guard — the one wrapper every cost-bearing live API route uses.
//
// Enforces, in order, BEFORE any paid provider call:
//   1. cheap body-size precheck (Content-Length)        → 413
//   2. SERVER-SIDE authentication (bearer JWT verify)    → 401
//   3. rate limiting: short burst window + sustained     → 429 (+ Retry-After)
//   4. per-user/per-tier concurrency slot                → 429
//   5. full body read + structural input caps            → 413 / 400
//   6. the route's own handler (which runs its existing semantic validation)
//
// Usage keeps each route's recognizable `export async function POST(req)` shape:
//
//   export async function POST(req: NextRequest) {
//     return withGuard(req, "EXPENSIVE_AI", async (_user) => {
//       ...original handler body, unchanged...
//     });
//   }
//
// Responses are generic (no secrets, no provider/auth internals, no echoed
// payload). The concurrency slot is always released in a finally.
// ============================================================================

import { authenticate, extractBearerToken, type AuthedUser, type TokenVerifier } from "@/lib/auth/serverAuth";
import { TIERS, CAPS, type RateTier } from "@/lib/security/config";
import { hitWindow, acquireConcurrency } from "@/lib/security/rateLimiter";
import { readCappedBody, checkStructuralCaps } from "@/lib/security/bodyCaps";
import { durableRateLimitHit, type RpcInvoker } from "@/lib/security/durableRateLimit";

function jsonResponse(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
  });
}

export const GUARD_MESSAGES = {
  unauthenticated: "Please sign in to continue.",
  rateLimited: "Too many requests. Please slow down and try again shortly.",
  busy: "Too many requests in progress. Please wait a moment and try again.",
  tooLarge: "Request is too large.",
  invalid: "Invalid request.",
} as const;

export function unauthorizedResponse(): Response {
  return jsonResponse({ error: GUARD_MESSAGES.unauthenticated }, 401);
}
export function rateLimitedResponse(retryAfterSec: number): Response {
  return jsonResponse({ error: GUARD_MESSAGES.rateLimited }, 429, {
    "Retry-After": String(Math.max(1, retryAfterSec)),
  });
}
export function busyResponse(): Response {
  return jsonResponse({ error: GUARD_MESSAGES.busy }, 429, { "Retry-After": "2" });
}
export function tooLargeResponse(): Response {
  return jsonResponse({ error: GUARD_MESSAGES.tooLarge }, 413);
}
export function invalidResponse(): Response {
  return jsonResponse({ error: GUARD_MESSAGES.invalid }, 400);
}

const key = (tier: RateTier, userId: string, kind: string) => `${tier}:${kind}:${userId}`;

export interface GuardOptions {
  /** TEST-ONLY: inject a token verifier so auth is deterministic offline. */
  verifier?: TokenVerifier;
  /** TEST-ONLY: inject the durable-limiter RPC invoker (mock the DB boundary). */
  durableInvoker?: RpcInvoker;
}

/**
 * Gate a request and run `handler` only when it passes every check. Returns the
 * handler's Response, or a generic error Response for the first failed gate.
 */
export async function withGuard(
  req: Request,
  tier: RateTier,
  handler: (user: AuthedUser) => Promise<Response>,
  opts: GuardOptions = {},
): Promise<Response> {
  const cfg = TIERS[tier];

  // 1. Cheap size precheck (before spending any auth work).
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > CAPS.MAX_BODY_BYTES) {
    return tooLargeResponse();
  }

  // 2. Authentication — server-verified; never trusts client-asserted identity.
  const user = await authenticate(req, opts.verifier);
  if (!user) return unauthorizedResponse();

  // 3. Rate limiting — burst first (rapid-fire), then sustained window.
  const burst = hitWindow(key(tier, user.id, "burst"), cfg.burst.ms, cfg.burst.max);
  if (!burst.ok) return rateLimitedResponse(burst.retryAfterSec);
  const sustained = hitWindow(key(tier, user.id, "window"), cfg.window.ms, cfg.window.max);
  if (!sustained.ok) return rateLimitedResponse(sustained.retryAfterSec);

  // 3b. Durable, cross-instance per-user quota (Supabase RPC). The DB derives
  // identity from auth.uid() via the forwarded bearer JWT — we send ONLY the
  // tier; limits/window are server-authoritative in the DB. A "denied" result
  // is a hard 429 BEFORE the provider call. An "unavailable" result (transient
  // RPC/network error or malformed response) FAILS OPEN to the local limiter
  // above — local burst/concurrency still apply, but the global cross-instance
  // quota is not guaranteed during a DB outage.
  const durableToken = extractBearerToken(req) ?? "";
  const durable = await durableRateLimitHit(tier, durableToken, opts.durableInvoker);
  if (durable.status === "denied") return rateLimitedResponse(durable.retryAfter);

  // 4. Concurrency / simultaneous-burst guard.
  const slot = acquireConcurrency(key(tier, user.id, "inflight"), cfg.concurrency);
  if (!slot.ok) return busyResponse();

  try {
    // 5. Structural input caps (read a clone; original body stays intact).
    const raw = await readCappedBody(req);
    if (!raw.ok) {
      return raw.violation === "body_too_large" ? tooLargeResponse() : invalidResponse();
    }
    if (raw.text.trim().length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.text);
      } catch {
        return invalidResponse(); // malformed JSON → 400, before any provider call
      }
      const caps = checkStructuralCaps(parsed);
      if (!caps.ok) return tooLargeResponse();
    }

    // 6. Route handler (runs its own semantic validation + provider call).
    return await handler(user);
  } finally {
    slot.release();
  }
}
