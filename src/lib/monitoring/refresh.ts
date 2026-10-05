// ============================================================================
// monitoring/refresh — pure, testable refresh orchestration for the dashboard
// ----------------------------------------------------------------------------
// One place that owns the invariants the UI relies on:
//   • at most one refresh in flight (rapid clicks don't launch duplicates),
//   • the busy flag ALWAYS resets in `finally` (after success AND error),
//   • rows are replaced only on success — an error preserves the last rows and
//     surfaces a message,
//   • dev-only diagnostics for each lifecycle step.
// No React, no Supabase — the component passes in its refs/setters and the
// Supabase-backed fetcher, so this logic can be unit-tested with fakes.
// ============================================================================

export type RefreshResult = "skipped" | "ok" | "error";

export const REFRESH_ERROR_MESSAGE =
  "Couldn't reach the database — showing the last loaded runs. Try Refresh again.";

export interface RefreshDeps<T> {
  /** Shared in-flight guard (a ref-like object). Prevents concurrent refreshes. */
  inFlight: { current: boolean };
  /** The actual read; returns ok=false on a read error (rows preserved). */
  fetcher: () => Promise<{ ok: boolean; rows: T[] }>;
  onStart: () => void;
  onRows: (rows: T[]) => void;
  onError: (message: string) => void;
  onSettled: () => void;
  onRefreshedAt?: (ms: number) => void;
  now?: () => number;
  /** Dev-only diagnostics sink (no sensitive data). */
  diag?: (event: string) => void;
}

/**
 * Run a single refresh. Returns "skipped" when one is already in flight, "ok"
 * on a successful load, or "error" on a read failure (existing rows kept).
 */
export async function runRefresh<T>(deps: RefreshDeps<T>): Promise<RefreshResult> {
  if (deps.inFlight.current) {
    deps.diag?.("refresh:skipped-inflight");
    return "skipped";
  }
  deps.inFlight.current = true;
  deps.onStart();
  deps.diag?.("refresh:started");
  try {
    const res = await deps.fetcher();
    if (res.ok) {
      deps.onRows(res.rows);
      deps.onRefreshedAt?.((deps.now ?? Date.now)());
      deps.diag?.("refresh:completed");
      return "ok";
    }
    deps.onError(REFRESH_ERROR_MESSAGE);
    deps.diag?.("refresh:failed");
    return "error";
  } catch {
    deps.onError(REFRESH_ERROR_MESSAGE);
    deps.diag?.("refresh:failed");
    return "error";
  } finally {
    deps.inFlight.current = false;
    deps.onSettled();
  }
}
