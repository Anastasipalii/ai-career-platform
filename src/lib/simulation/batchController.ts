// ============================================================================
// simulation/batchController — framework-agnostic batch lifecycle manager
// ----------------------------------------------------------------------------
// Wraps the pure engine (runSimulationBatch) with the state a UI needs:
//   • single-flight guard (no second batch while one runs; no double-click),
//   • a FRESH AbortController + FRESH counters for every batch (no reuse of a
//     previous batch's arrays/state — zero cross-batch contamination),
//   • live progress (queued / running / completed / failed / cancelled /
//     active workers / progress% / elapsed) derived from onRunSettled plus a
//     thin instrumented sink wrapper,
//   • per-sink-call error capture so one persistence failure is reported, not
//     fatal,
//   • a re-checkable admin gate (start refuses to run for a non-admin).
// It performs NO I/O itself and imports nothing external — persistence is the
// injected sink (the production one runs under the admin's authed session).
// ============================================================================

import {
  runSimulationBatch,
  type SimulationSink,
  type SimulationSummary,
  type SimRunResult,
} from "@/lib/simulation/engine";
import {
  normalizeSimulationConfig,
  type SimulationConfig,
  type SimulationConfigInput,
} from "@/lib/simulation/config";

export type BatchStatus = "idle" | "running" | "completed" | "cancelled" | "error";

export interface BatchProgress {
  status: BatchStatus;
  config: SimulationConfig | null;
  total: number;
  queued: number;
  running: number; // active workers
  completed: number;
  failed: number;
  cancelled: number;
  settled: number;
  progressPct: number;
  elapsedMs: number;
  persistenceErrors: number;
  error: string | null;
  notes: string[];
  summary: SimulationSummary | null;
}

export interface BatchControllerDeps {
  /** Persistence sink factory — a NEW sink per batch. */
  makeSink: () => SimulationSink;
  /** Override the engine (tests). Defaults to the real engine. */
  runBatch?: typeof runSimulationBatch;
  /** Clock (tests). Defaults to Date.now. */
  now?: () => number;
  /** Passed through to the engine (tests inject a no-op sleep + seq uuid). */
  engine?: { sleep?: (ms: number) => Promise<void>; uuid?: () => string };
}

const freshLive = () => ({
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  settled: 0,
  persistenceErrors: 0,
});

export class SimulationBatchController {
  private deps: Required<Pick<BatchControllerDeps, "makeSink">> & BatchControllerDeps;
  private now: () => number;

  private active = false; // single-flight guard (set synchronously)
  private status: BatchStatus = "idle";
  private config: SimulationConfig | null = null;
  private notes: string[] = [];
  private error: string | null = null;
  private summary: SimulationSummary | null = null;
  private startedAtMs = 0;
  private finishedAtMs = 0;
  private ac: AbortController | null = null;
  private live = freshLive();
  private listeners = new Set<(p: BatchProgress) => void>();

  constructor(deps: BatchControllerDeps) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
  }

  isRunning(): boolean {
    return this.active;
  }

  onChange(cb: (p: BatchProgress) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getProgress(): BatchProgress {
    const total = this.config?.totalRuns ?? 0;
    const { running, completed, failed, cancelled, settled, persistenceErrors } = this.live;
    const queued = Math.max(0, total - settled - running);
    const progressPct = total > 0 ? Math.round((settled / total) * 100) : 0;
    const end = this.status === "running" ? this.now() : this.finishedAtMs || this.startedAtMs;
    const elapsedMs = this.startedAtMs ? Math.max(0, end - this.startedAtMs) : 0;
    return {
      status: this.status,
      config: this.config,
      total,
      queued,
      running,
      completed,
      failed,
      cancelled,
      settled,
      progressPct,
      elapsedMs,
      persistenceErrors,
      error: this.error,
      notes: this.notes,
      summary: this.summary,
    };
  }

  private notify(): void {
    const snap = this.getProgress();
    for (const cb of this.listeners) {
      try {
        cb(snap);
      } catch {
        /* a listener error must never affect the batch */
      }
    }
  }

  /** Reset to a clean idle state. No-op while a batch is running. */
  reset(): void {
    if (this.active) return;
    this.status = "idle";
    this.config = null;
    this.notes = [];
    this.error = null;
    this.summary = null;
    this.startedAtMs = 0;
    this.finishedAtMs = 0;
    this.ac = null;
    this.live = freshLive();
    this.notify();
  }

  /** Abort the in-flight batch. Completed runs stay completed; in-flight and
   *  not-yet-started runs settle as cancelled. Safe to call when idle. */
  cancel(): void {
    if (this.active && this.ac && !this.ac.signal.aborted) {
      this.ac.abort();
      this.notify();
    }
  }

  /**
   * Start a batch. Returns the summary, or null if it did not run (already
   * running, or the admin re-check failed). `ensureAdmin`, when provided, is
   * awaited BEFORE any run is created — a non-admin can never start the engine,
   * even by calling this directly (defence beyond the hidden button).
   */
  async start(
    input: SimulationConfigInput = {},
    ensureAdmin?: () => Promise<boolean>
  ): Promise<SimulationSummary | null> {
    // Single-flight guard — set synchronously so a double-click / rapid second
    // call cannot slip through before the first hits its first await.
    if (this.active) return null;
    this.active = true;

    // Fresh state for THIS batch (never reuse the previous batch's counters,
    // controller, or summary).
    this.status = "running";
    this.error = null;
    this.summary = null;
    this.live = freshLive();
    this.finishedAtMs = 0;
    this.ac = new AbortController();

    const { config, notes } = normalizeSimulationConfig(input);
    this.config = config;
    this.notes = notes;

    try {
      // Server-enforced admin re-check before creating any run.
      if (ensureAdmin) {
        const ok = await ensureAdmin().catch(() => false);
        if (!ok) {
          this.status = "error";
          this.error = "Access denied: current user is not an administrator.";
          this.active = false;
          this.notify();
          return null;
        }
      }

      this.startedAtMs = this.now();
      this.notify();

      const runBatch = this.deps.runBatch ?? runSimulationBatch;
      const sink = this.instrument(this.deps.makeSink());

      const summary = await runBatch({
        config,
        sink,
        signal: this.ac.signal,
        sleep: this.deps.engine?.sleep,
        uuid: this.deps.engine?.uuid,
        onRunSettled: (r: SimRunResult) => {
          this.live.settled += 1;
          if (r.outcome === "completed") this.live.completed += 1;
          else if (r.outcome === "failed") this.live.failed += 1;
          else if (r.outcome === "cancelled") this.live.cancelled += 1;
          this.notify();
        },
      });

      // Reconcile to the engine's authoritative tallies (covers edge cases such
      // as create-time persistence failures the settled callback never saw).
      this.summary = summary;
      this.live.completed = summary.completed;
      this.live.failed = summary.failed;
      this.live.cancelled = summary.cancelled;
      this.live.settled = summary.completed + summary.failed + summary.cancelled;
      this.live.running = 0;
      this.finishedAtMs = this.now();
      this.status = this.ac.signal.aborted ? "cancelled" : "completed";
      return summary;
    } catch (e) {
      // A batch-level failure must never fabricate success.
      this.finishedAtMs = this.now();
      this.status = "error";
      this.error = e instanceof Error ? e.message : "Simulation batch failed unexpectedly.";
      this.live.running = 0;
      return null;
    } finally {
      this.active = false;
      this.notify();
    }
  }

  /** Wrap a sink so we can (a) track active workers and (b) count — never
   *  swallow silently — per-call persistence errors. createRun errors are
   *  re-thrown so the engine marks that single run failed; other errors are
   *  reported and suppressed so one write hiccup can't crash the batch/UI. */
  private instrument(inner: SimulationSink): SimulationSink {
    const bump = () => {
      this.live.persistenceErrors += 1;
    };
    return {
      createRun: async (a) => {
        try {
          return await inner.createRun(a);
        } catch (e) {
          bump();
          throw e; // engine needs to know this run could not be created
        }
      },
      markRunning: async (a) => {
        this.live.running += 1;
        try {
          await inner.markRunning(a);
        } catch {
          bump();
        }
      },
      startStage: async (a) => {
        try {
          await inner.startStage(a);
        } catch {
          bump();
        }
      },
      completeStage: async (a) => {
        try {
          await inner.completeStage(a);
        } catch {
          bump();
        }
      },
      failStage: async (a) => {
        try {
          await inner.failStage(a);
        } catch {
          bump();
        }
      },
      completeRun: async (a) => {
        this.live.running = Math.max(0, this.live.running - 1);
        try {
          await inner.completeRun(a);
        } catch {
          bump();
        }
      },
      failRun: async (a) => {
        this.live.running = Math.max(0, this.live.running - 1);
        try {
          await inner.failRun(a);
        } catch {
          bump();
        }
      },
      cancelRun: async (a) => {
        this.live.running = Math.max(0, this.live.running - 1);
        try {
          await inner.cancelRun(a);
        } catch {
          bump();
        }
      },
    };
  }
}
