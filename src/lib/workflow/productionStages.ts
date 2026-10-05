// ============================================================================
// workflow/productionStages — real-pipeline stage sequence + a safe tracker
// ----------------------------------------------------------------------------
// Pure (no Supabase / network imports) so it is fully unit-testable. Provides:
//   • PRODUCTION_STAGES — the ordered pre-terminal stages of a real run,
//   • StageTracker      — emits a begin + (complete | fail) event per stage via
//                         an injected recorder, self-heals so a started stage
//                         ALWAYS gets a terminal event, and never throws into
//                         the pipeline,
//   • planProductionStages — the expected ordered plan for a given outcome
//                         (used by tests to prove the sequence, Branch-B
//                         independence, and failure-at-stage behaviour).
// The terminal "completed" event is emitted separately by completeWorkflowRun,
// so this module never duplicates it.
// ============================================================================

import type { WorkflowStage } from "@/lib/workflow/stages";

/** Ordered stages of a real production run BEFORE the terminal "completed"
 *  (which completeWorkflowRun records). */
export const PRODUCTION_STAGES: readonly WorkflowStage[] = [
  "resume_uploaded",
  "resume_analysis",
  "profile_created",
  "job_search",
  "job_filtering",
  "job_ranking",
  "ats_analysis",
  "cover_letter",
  "interview_questions",
  "persistence",
];

export interface StageEventLog {
  stage: WorkflowStage;
  status: "running" | "completed" | "failed";
  atMs: number;
  durationMs?: number;
  errorCode?: string;
}

/** Side-effect sink for stage events (e.g. a DB adapter). All methods are
 *  best-effort and may be async; the tracker swallows their errors. */
export interface StageRecorder {
  begin(stage: WorkflowStage): void | Promise<void>;
  end(stage: WorkflowStage): void | Promise<void>;
  fail(stage: WorkflowStage, errorCode: string, errorMessage: string): void | Promise<void>;
}

/**
 * Emits a begin + terminal event per stage. Guarantees pairing: starting a new
 * stage while one is active auto-completes the previous one, and every begin is
 * matched by a completed or failed entry in {@link log}. Never throws — safe to
 * sprinkle through the production pipeline without risking the run.
 */
export class StageTracker {
  private active: WorkflowStage | null = null;
  private startMs = 0;
  readonly log: StageEventLog[] = [];
  private readonly recorder: StageRecorder | null;
  private readonly now: () => number;

  constructor(recorder: StageRecorder | null = null, now: () => number = () => Date.now()) {
    this.recorder = recorder;
    this.now = now;
  }

  get activeStage(): WorkflowStage | null {
    return this.active;
  }

  async begin(stage: WorkflowStage): Promise<void> {
    if (this.active) await this.end(this.active); // self-heal: close the previous
    this.active = stage;
    this.startMs = this.now();
    this.log.push({ stage, status: "running", atMs: this.startMs });
    try {
      await this.recorder?.begin(stage);
    } catch {
      /* best-effort */
    }
  }

  async end(stage?: WorkflowStage): Promise<void> {
    const s = stage ?? this.active;
    if (!s || this.active !== s) return; // nothing to close / mismatch
    const durationMs = Math.max(0, this.now() - this.startMs);
    this.log.push({ stage: s, status: "completed", atMs: this.now(), durationMs });
    this.active = null;
    try {
      await this.recorder?.end(s);
    } catch {
      /* best-effort */
    }
  }

  async fail(stage: WorkflowStage, errorCode: string, errorMessage: string): Promise<void> {
    const durationMs = this.active === stage ? Math.max(0, this.now() - this.startMs) : 0;
    this.log.push({ stage, status: "failed", atMs: this.now(), durationMs, errorCode });
    this.active = null;
    try {
      await this.recorder?.fail(stage, errorCode, errorMessage);
    } catch {
      /* best-effort */
    }
  }
}

/** Outcome flags that determine which stages a real run walks. */
export interface ProductionOutcome {
  /** Stage at which the run fatally failed (nothing generated), if any. */
  fatalStage?: WorkflowStage;
}

/**
 * The exact ordered stage plan for a given outcome. Branch B (ats_analysis,
 * cover_letter, interview_questions, persistence) ALWAYS runs — even when the
 * provider is unavailable or zero relevant jobs are found — so those stages are
 * present on every non-fatal run. On a fatal outcome the plan stops at the
 * failed stage.
 */
export function planProductionStages(
  o: ProductionOutcome = {}
): { stage: WorkflowStage; status: "completed" | "failed" }[] {
  const plan: { stage: WorkflowStage; status: "completed" | "failed" }[] = [];
  for (const stage of PRODUCTION_STAGES) {
    if (o.fatalStage && stage === o.fatalStage) {
      plan.push({ stage, status: "failed" });
      return plan;
    }
    plan.push({ stage, status: "completed" });
  }
  return plan;
}

/** Drive a tracker through a plan (begin + terminal per stage). Used by tests
 *  and available for non-inline emission. Stops after a failed stage. */
export async function drivePlan(
  tracker: StageTracker,
  plan: { stage: WorkflowStage; status: "completed" | "failed" }[]
): Promise<void> {
  for (const { stage, status } of plan) {
    await tracker.begin(stage);
    if (status === "failed") {
      await tracker.fail(stage, "production_stage_failed", `Failed at ${stage}.`);
      return;
    }
    await tracker.end(stage);
  }
}

/** In-memory recorder for tests — records the ordered begin/end/fail calls. */
export function createMemoryRecorder(): {
  recorder: StageRecorder;
  calls: { stage: WorkflowStage; type: "begin" | "end" | "fail"; errorCode?: string }[];
} {
  const calls: { stage: WorkflowStage; type: "begin" | "end" | "fail"; errorCode?: string }[] = [];
  const recorder: StageRecorder = {
    begin: (stage) => {
      calls.push({ stage, type: "begin" });
    },
    end: (stage) => {
      calls.push({ stage, type: "end" });
    },
    fail: (stage, errorCode) => {
      calls.push({ stage, type: "fail", errorCode });
    },
  };
  return { recorder, calls };
}
