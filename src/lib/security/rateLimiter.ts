// ============================================================================
// security/rateLimiter — deterministic, in-memory, first-party rate limiting.
//
// DEPLOYMENT LIMITATION (documented on purpose):
//   This limiter keeps counters in process memory. On a serverless / multi-
//   instance deployment (e.g. Vercel) each instance has its OWN counters, so the
//   effective global ceiling is (per-instance limit × live instances), and a
//   cold start resets an instance's counters. This is therefore a responsible
//   LAUNCH-LEVEL abuse brake — it stops trivial single-client rapid-fire cost
//   amplification — NOT a globally strong distributed quota. A durable quota
//   (shared store) is a deliberate later upgrade; see PROJECT_STATUS.md. We do
//   NOT silently present this as a global quota.
//
// The logic is pure and deterministic given an injectable clock, so tests assert
// exact allow/deny/retry-after behavior without timers or sleeps.
// ============================================================================

interface WindowState {
  timestamps: number[];
}

const windows = new Map<string, WindowState>();
const inflight = new Map<string, number>();

let now: () => number = () => Date.now();

/** TEST-ONLY: inject a deterministic clock. */
export function __setNow(fn: () => number): void {
  now = fn;
}
/** TEST-ONLY: clear all counters. */
export function __resetRateLimiter(): void {
  windows.clear();
  inflight.clear();
  now = () => Date.now();
}

export interface WindowResult {
  ok: boolean;
  /** Seconds until the oldest in-window request ages out (for Retry-After). */
  retryAfterSec: number;
}

/**
 * Sliding-window check. Records the request time when allowed. Keyed string must
 * already encode the tier + user + window-kind so quotas never collide.
 */
export function hitWindow(key: string, windowMs: number, max: number): WindowResult {
  const t = now();
  const prev = windows.get(key)?.timestamps ?? [];
  const live = prev.filter((ts) => t - ts < windowMs);
  if (live.length >= max) {
    const oldest = live[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (t - oldest)) / 1000));
    windows.set(key, { timestamps: live });
    return { ok: false, retryAfterSec };
  }
  live.push(t);
  windows.set(key, { timestamps: live });
  return { ok: true, retryAfterSec: 0 };
}

export interface ConcurrencySlot {
  ok: boolean;
  release: () => void;
}

/** Acquire an in-flight slot for `key`; release() MUST be called in a finally. */
export function acquireConcurrency(key: string, max: number): ConcurrencySlot {
  const n = inflight.get(key) ?? 0;
  if (n >= max) {
    return { ok: false, release: () => {} };
  }
  inflight.set(key, n + 1);
  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      const cur = (inflight.get(key) ?? 1) - 1;
      if (cur <= 0) inflight.delete(key);
      else inflight.set(key, cur);
    },
  };
}
