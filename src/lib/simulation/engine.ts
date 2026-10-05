// ============================================================================
// simulation/engine — controlled load-test engine (pure, no external calls)
// ----------------------------------------------------------------------------
// Drives N synthetic workflow runs through the real stage sequence using a
// BOUNDED worker pool (never Promise.all over every run), deterministic RNG,
// artificial per-stage delays, and reproducible failure injection. It performs
// NO OpenAI / Arbeitnow / job-board / email / employer / application calls —
// this module imports nothing but the pure stage/profile/config helpers and
// talks to the database only through an injected {@link SimulationSink}.
//
// Every run:
//   • gets its own run_key (UUID) and isolated local state,
//   • is marked simulation (mode = "stress" → is_simulation = true in DB),
//   • can reach all five statuses (queued → running → completed | failed
//     | cancelled),
//   • writes an append-only stage-event timeline.
// No shared mutable results array is written concurrently — each worker only
// touches its own pre-allocated slot, so runs cannot contaminate each other.
// ============================================================================

import type { WorkflowStage } from "@/lib/workflow/stages";
import { SIMULATION_STAGE_SEQUENCE, simulationProfileForIndex } from "@/lib/simulation/profiles";
import type { SimulationConfig } from "@/lib/simulation/config";

// ── deterministic PRNG (mulberry32) ──────────────────────────────────────────
// Tiny, dependency-free, fully reproducible: same seed ⇒ same stream.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Outcome of a single simulated run. */
export type SimRunOutcome = "completed" | "failed" | "cancelled";

export interface SimRunResult {
  index: number;
  runKey: string;
  simulationUserId: string;
  profession: string;
  language: string;
  outcome: SimRunOutcome;
  failedStage?: WorkflowStage;
  jobsFound: number;
  durationMs: number;
}

export interface SimulationSummary {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  startedAtIso: string;
  finishedAtIso: string;
  wallClockMs: number;
  results: SimRunResult[];
}

// ── persistence sink (injected — keeps the engine DB-agnostic & testable) ─────
// The production adapter maps these to the existing workflowRun.ts functions
// (which run under the admin's authenticated session and RLS). Tests pass an
// in-memory sink, so the engine can be exercised with zero I/O.
export interface SimStageRef {
  runId: string;
  runKey: string;
  stage: WorkflowStage;
  startedAtMs: number;
}

export interface SimulationSink {
  createRun(input: {
    runKey: string;
    simulationUserId: string;
    profession: string;
    language: string;
    index: number;
  }): Promise<{ runId: string }>;
  markRunning(ctx: { runId: string; runKey: string }): Promise<void>;
  startStage(ctx: {
    runId: string;
    runKey: string;
    stage: WorkflowStage;
    progress: number;
  }): Promise<void>;
  completeStage(ctx: {
    runId: string;
    runKey: string;
    stage: WorkflowStage;
    progress: number;
    durationMs: number;
  }): Promise<void>;
  failStage(ctx: {
    runId: string;
    runKey: string;
    stage: WorkflowStage;
    durationMs: number;
    errorCode: string;
    errorMessage: string;
  }): Promise<void>;
  completeRun(ctx: {
    runId: string;
    runKey: string;
    profession: string;
    language: string;
    jobsFound: number;
    durationMs: number;
  }): Promise<void>;
  failRun(ctx: {
    runId: string;
    runKey: string;
    stage: WorkflowStage;
    errorCode: string;
    errorMessage: string;
  }): Promise<void>;
  cancelRun(ctx: { runId: string; runKey: string; stage: WorkflowStage }): Promise<void>;
}

export interface SimulationEngineOptions {
  config: SimulationConfig;
  sink: SimulationSink;
  /** Abort mid-batch: in-flight runs are cancelled, queued runs never start. */
  signal?: AbortSignal;
  /** Injected so tests run instantly and production can throttle realistically. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected so run_key is a real UUID in prod and deterministic in tests. */
  uuid?: () => string;
  /** Optional progress callback (e.g. to stream batch progress to the UI). */
  onRunSettled?: (result: SimRunResult) => void;
}

const defaultSleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

const defaultUuid = (): string =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : // deterministic-ish fallback; the production adapter always has crypto
      "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);

/**
 * Deterministically choose which run indices fail. Returns an EXACT count of
 * `round(total * rate)` evenly-spaced indices, so a 10% rate on 100 runs fails
 * exactly 10 specific, reproducible runs every time.
 */
export function failingIndexSet(total: number, failureRatePct: number): Set<number> {
  const failCount = Math.round((total * failureRatePct) / 100);
  const set = new Set<number>();
  if (failCount <= 0 || total <= 0) return set;
  for (let k = 0; k < failCount; k++) {
    set.add(Math.min(total - 1, Math.floor(((k + 0.5) * total) / failCount)));
  }
  return set;
}

// Stages a run walks after the initial "queued" (which the create step covers)
// and before the terminal "completed" (which completeRun covers).
const WORKING_STAGES: readonly WorkflowStage[] = SIMULATION_STAGE_SEQUENCE.filter(
  (s) => s !== "queued" && s !== "completed"
);

/**
 * Run the whole controlled batch. Resolves once every run has reached a
 * terminal status. Never rejects on an individual run's failure — those are
 * captured as `failed` outcomes in the summary.
 */
export async function runSimulationBatch(
  opts: SimulationEngineOptions
): Promise<SimulationSummary> {
  const { config, sink } = opts;
  const sleep = opts.sleep ?? defaultSleep;
  const uuid = opts.uuid ?? defaultUuid;
  const signal = opts.signal;

  const total = config.totalRuns;
  const failing = failingIndexSet(total, config.failureRatePct);
  const results: SimRunResult[] = new Array(total); // pre-allocated, per-index writes
  const startedAt = Date.now();

  // Each run owns an independent PRNG stream seeded from (seed, index) so its
  // delays and failing-stage choice are reproducible and independent of others.
  const runOne = async (index: number): Promise<void> => {
    const rng = mulberry32((config.seed ^ (index * 2654435761)) >>> 0);
    const profile = simulationProfileForIndex(index);
    const runKey = uuid();
    const simulationUserId = `sim-${config.seed}-${index}`;
    const runStart = Date.now();

    const settle = (r: SimRunResult): void => {
      results[index] = r;
      opts.onRunSettled?.(r);
    };

    // If aborted before we even start, record a cancellation without touching DB
    // beyond a cancel marker is impossible (no runId yet) — so just mark locally.
    if (signal?.aborted) {
      settle({
        index, runKey, simulationUserId, profession: profile.profession,
        language: profile.language, outcome: "cancelled", jobsFound: 0, durationMs: 0,
      });
      return;
    }

    // queued → create the run row (mode = stress ⇒ is_simulation = true)
    const { runId } = await sink.createRun({
      runKey, simulationUserId, profession: profile.profession,
      language: profile.language, index,
    });
    await sink.markRunning({ runId, runKey });

    const willFail = failing.has(index);
    // Deterministically pick the failing stage for a failing run.
    const failStageIdx = willFail ? Math.floor(rng() * WORKING_STAGES.length) : -1;

    for (let i = 0; i < WORKING_STAGES.length; i++) {
      const stage = WORKING_STAGES[i];

      if (signal?.aborted) {
        await sink.cancelRun({ runId, runKey, stage });
        settle({
          index, runKey, simulationUserId, profession: profile.profession,
          language: profile.language, outcome: "cancelled", jobsFound: 0,
          durationMs: Date.now() - runStart,
        });
        return;
      }

      const progress = Math.round(((i + 1) / (WORKING_STAGES.length + 1)) * 100);
      await sink.startStage({ runId, runKey, stage, progress });

      // artificial, observable work — NO external calls happen here.
      const delay =
        config.minStageDelayMs +
        Math.floor(rng() * (config.maxStageDelayMs - config.minStageDelayMs + 1));
      const stageStart = Date.now();
      await sleep(delay);
      const stageDuration = Date.now() - stageStart;

      if (i === failStageIdx) {
        const errorCode = "sim_injected_failure";
        const errorMessage = `Simulated failure at stage "${stage}".`;
        await sink.failStage({ runId, runKey, stage, durationMs: stageDuration, errorCode, errorMessage });
        await sink.failRun({ runId, runKey, stage, errorCode, errorMessage });
        settle({
          index, runKey, simulationUserId, profession: profile.profession,
          language: profile.language, outcome: "failed", failedStage: stage,
          jobsFound: 0, durationMs: Date.now() - runStart,
        });
        return;
      }

      await sink.completeStage({ runId, runKey, stage, progress, durationMs: stageDuration });
    }

    const durationMs = Date.now() - runStart;
    await sink.completeRun({
      runId, runKey, profession: profile.profession, language: profile.language,
      jobsFound: profile.jobsFound, durationMs,
    });
    settle({
      index, runKey, simulationUserId, profession: profile.profession,
      language: profile.language, outcome: "completed", jobsFound: profile.jobsFound, durationMs,
    });
  };

  // ── bounded worker pool ──────────────────────────────────────────────────
  // A shared cursor hands out the next index to a fixed set of `concurrency`
  // workers. This caps in-flight runs; it is NOT `Promise.all(all100Runs)`.
  // The Promise.all below awaits only the (≤20) WORKERS, not every run.
  let cursor = 0;
  const workerCount = Math.min(config.concurrency, total);
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= total) return;
      try {
        await runOne(index);
      } catch {
        // A sink/DB error for one run must never abort the batch or contaminate
        // its siblings — record it as a failed outcome and keep the pool going.
        if (!results[index]) {
          results[index] = {
            index,
            runKey: "",
            simulationUserId: `sim-${config.seed}-${index}`,
            profession: simulationProfileForIndex(index).profession,
            language: simulationProfileForIndex(index).language,
            outcome: "failed",
            jobsFound: 0,
            durationMs: 0,
          };
        }
      }
    }
  });
  await Promise.all(workers);

  const finishedAt = Date.now();
  const flat = results.filter(Boolean);
  return {
    total,
    completed: flat.filter((r) => r.outcome === "completed").length,
    failed: flat.filter((r) => r.outcome === "failed").length,
    cancelled: flat.filter((r) => r.outcome === "cancelled").length,
    startedAtIso: new Date(startedAt).toISOString(),
    finishedAtIso: new Date(finishedAt).toISOString(),
    wallClockMs: finishedAt - startedAt,
    results: flat,
  };
}
