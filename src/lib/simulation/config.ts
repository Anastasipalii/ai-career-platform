// ============================================================================
// simulation/config — validated batch configuration for the load-test engine
// ----------------------------------------------------------------------------
// Pure data + validation. No Supabase / OpenAI / network imports. Defines the
// allowed knobs for a controlled load test and a normalizer that clamps any
// caller-supplied values into safe, in-range settings (never throws).
// ============================================================================

/** Selectable batch sizes for the load test. */
export const ALLOWED_TOTAL_RUNS = [10, 25, 50, 100, 250, 500] as const;
export type AllowedTotalRuns = (typeof ALLOWED_TOTAL_RUNS)[number];
export const DEFAULT_TOTAL_RUNS: AllowedTotalRuns = 100;

/** Worker-pool size. The engine NEVER starts all runs at once — this bounds
 *  how many runs are in flight simultaneously. */
export const CONCURRENCY_MIN = 1;
export const CONCURRENCY_MAX = 20;
export const DEFAULT_CONCURRENCY = 5;

/** Deterministic, reproducible failure injection rate (percent of the batch). */
export const ALLOWED_FAILURE_RATES_PCT = [0, 5, 10, 20] as const;
export type AllowedFailureRatePct = (typeof ALLOWED_FAILURE_RATES_PCT)[number];
export const DEFAULT_FAILURE_RATE_PCT: AllowedFailureRatePct = 0;

/** Per-stage artificial delay window. Defaults are small but non-zero so the
 *  timeline is observable in the monitoring UI without making a run drag. */
export const STAGE_DELAY_FLOOR_MS = 0;
export const STAGE_DELAY_CEILING_MS = 5000;
export const DEFAULT_MIN_STAGE_DELAY_MS = 40;
export const DEFAULT_MAX_STAGE_DELAY_MS = 160;

/** Fully-resolved, validated simulation settings the engine consumes. */
export interface SimulationConfig {
  totalRuns: AllowedTotalRuns;
  concurrency: number;
  failureRatePct: AllowedFailureRatePct;
  minStageDelayMs: number;
  maxStageDelayMs: number;
  /** Seed for the deterministic PRNG — same seed ⇒ identical run outcomes. */
  seed: number;
}

/** Caller-supplied (partial, untrusted) settings. */
export interface SimulationConfigInput {
  totalRuns?: number;
  concurrency?: number;
  failureRatePct?: number;
  minStageDelayMs?: number;
  maxStageDelayMs?: number;
  seed?: number;
}

const clampInt = (n: unknown, lo: number, hi: number, fallback: number): number => {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
};

const nearestAllowed = <T extends number>(n: unknown, allowed: readonly T[], fallback: T): T => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  if (allowed.includes(v as T)) return v as T;
  // snap to the closest allowed value so an out-of-set request is corrected,
  // not rejected — the engine always runs with a valid, bounded batch.
  return allowed.reduce((best, c) => (Math.abs(c - v) < Math.abs(best - v) ? c : best), fallback);
};

/**
 * Normalize untrusted input into a valid {@link SimulationConfig}. Returns the
 * clamped config plus any `notes` describing corrections that were applied, so
 * the caller can surface "you asked for X, running Y" without failing.
 */
export function normalizeSimulationConfig(
  input: SimulationConfigInput = {}
): { config: SimulationConfig; notes: string[] } {
  const notes: string[] = [];

  const totalRuns = nearestAllowed(input.totalRuns, ALLOWED_TOTAL_RUNS, DEFAULT_TOTAL_RUNS);
  if (input.totalRuns !== undefined && input.totalRuns !== totalRuns)
    notes.push(`totalRuns ${input.totalRuns} → ${totalRuns}`);

  const concurrency = clampInt(
    input.concurrency ?? DEFAULT_CONCURRENCY,
    CONCURRENCY_MIN,
    CONCURRENCY_MAX,
    DEFAULT_CONCURRENCY
  );
  if (input.concurrency !== undefined && input.concurrency !== concurrency)
    notes.push(`concurrency ${input.concurrency} → ${concurrency}`);

  const failureRatePct = nearestAllowed(
    input.failureRatePct,
    ALLOWED_FAILURE_RATES_PCT,
    DEFAULT_FAILURE_RATE_PCT
  );
  if (input.failureRatePct !== undefined && input.failureRatePct !== failureRatePct)
    notes.push(`failureRatePct ${input.failureRatePct} → ${failureRatePct}`);

  let minStageDelayMs = clampInt(
    input.minStageDelayMs ?? DEFAULT_MIN_STAGE_DELAY_MS,
    STAGE_DELAY_FLOOR_MS,
    STAGE_DELAY_CEILING_MS,
    DEFAULT_MIN_STAGE_DELAY_MS
  );
  let maxStageDelayMs = clampInt(
    input.maxStageDelayMs ?? DEFAULT_MAX_STAGE_DELAY_MS,
    STAGE_DELAY_FLOOR_MS,
    STAGE_DELAY_CEILING_MS,
    DEFAULT_MAX_STAGE_DELAY_MS
  );
  if (minStageDelayMs > maxStageDelayMs) {
    // keep the window coherent instead of erroring
    [minStageDelayMs, maxStageDelayMs] = [maxStageDelayMs, minStageDelayMs];
    notes.push("min/max stage delay were swapped to keep min ≤ max");
  }

  const seed = Number.isFinite(Number(input.seed)) ? Math.floor(Number(input.seed)) : 1;

  return {
    config: { totalRuns, concurrency, failureRatePct, minStageDelayMs, maxStageDelayMs, seed },
    notes,
  };
}
