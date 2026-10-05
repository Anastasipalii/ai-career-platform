// ============================================================================
// security/durableRateLimit — shared, cross-instance per-user quota.
//
// Calls the VERIFIED production Supabase RPC `public.rate_limit_hit(p_tier text)`
// using the request's already-verified bearer JWT, so the DB derives identity
// from auth.uid(). The app sends ONLY the tier — never user_id, max, or window:
// those are server-authoritative inside the SECURITY DEFINER function
// (EXPENSIVE_AI = 30/60s, PROVIDER_SEARCH = 20/60s). No service-role key.
//
// This is the durable layer that bounds cost ACROSS serverless instances. The
// Pass A in-memory burst/concurrency limiter remains a separate local layer.
//
// FAILURE MODE (durable layer only): on a transient RPC/network error or a
// malformed response, this returns status "unavailable" and the guard FAILS
// OPEN to the local limiter. During such an outage, local per-process burst and
// concurrency protection remain active, but a globally bounded cross-instance
// quota is NOT guaranteed. Authentication is unaffected and remains fail-closed.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { RateTier } from "@/lib/security/config";

export type DurableStatus = "allowed" | "denied" | "unavailable";

export interface DurableDecision {
  status: DurableStatus;
  /** Seconds to wait (only meaningful when status === "denied"). */
  retryAfter: number;
  count?: number;
  limit?: number;
}

/** The exact RPC argument payload — ONLY p_tier. No user_id / max / window. */
export function buildRpcArgs(tier: RateTier): { p_tier: RateTier } {
  return { p_tier: tier };
}

/** Low-level invoker: performs the RPC and returns its raw data (or throws). */
export type RpcInvoker = (tier: RateTier, token: string) => Promise<unknown>;

let cachedInvoker: RpcInvoker | null = null;

function defaultInvoker(): RpcInvoker {
  if (cachedInvoker) return cachedInvoker;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Misconfiguration → treated as durable-layer unavailable (fail-open).
    cachedInvoker = async () => {
      throw new Error("supabase-not-configured");
    };
    return cachedInvoker;
  }
  cachedInvoker = async (tier: RateTier, token: string) => {
    // A per-request anon client that forwards the caller's verified JWT so the
    // RPC's auth.uid() resolves to this user. No service-role, no persisted state.
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.rpc("rate_limit_hit", buildRpcArgs(tier));
    if (error) throw new Error(error.message || "rpc-error");
    return data;
  };
  return cachedInvoker;
}

interface ParsedRpc {
  allowed: boolean;
  count: number;
  limit: number;
  retry_after: number;
}

/** Validate the RPC response as untrusted runtime data. Returns null if malformed. */
export function parseRpcResponse(data: unknown): ParsedRpc | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const finiteNonNeg = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  const finitePos = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n > 0;
  if (typeof d.allowed !== "boolean") return null;
  if (!finiteNonNeg(d.count)) return null;
  if (!finitePos(d.limit)) return null;
  if (!finiteNonNeg(d.retry_after)) return null;
  return { allowed: d.allowed, count: d.count, limit: d.limit, retry_after: d.retry_after };
}

/**
 * Consult the durable per-user quota for `tier`, forwarding `token` (the
 * already-verified bearer JWT). Never throws: any RPC/network error or malformed
 * response resolves to "unavailable" so the guard can fail open to local limits.
 */
export async function durableRateLimitHit(
  tier: RateTier,
  token: string,
  invoker: RpcInvoker = defaultInvoker(),
): Promise<DurableDecision> {
  if (!token) return { status: "unavailable", retryAfter: 0 };
  let raw: unknown;
  try {
    raw = await invoker(tier, token);
  } catch {
    return { status: "unavailable", retryAfter: 0 };
  }
  const v = parseRpcResponse(raw);
  if (!v) return { status: "unavailable", retryAfter: 0 };
  if (v.allowed) return { status: "allowed", retryAfter: 0, count: v.count, limit: v.limit };
  return {
    status: "denied",
    retryAfter: Math.max(1, Math.ceil(v.retry_after)),
    count: v.count,
    limit: v.limit,
  };
}

/** TEST-ONLY: override the default RPC invoker. */
export function __setDurableInvoker(i: RpcInvoker | null): void {
  cachedInvoker = i;
}
