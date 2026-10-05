// ============================================================================
// workflow/stages — pure, DB-free workflow status & stage model
// ----------------------------------------------------------------------------
// Shared status/stage vocabulary, a status transition validator, progress
// clamping, and an event-metadata sanitizer. No Supabase / network imports, so
// this is safe to unit-test in isolation and to import from both client and
// server code. Persistence lives in workflowRun.ts (which uses these helpers).
// ============================================================================

/** Canonical run statuses (mirrors the workflow_runs status CHECK constraint). */
export const WORKFLOW_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/** Canonical, stable stage names for the run timeline (stored in current_step /
 *  workflow_events.step). Reuses existing values where practical. */
export const WORKFLOW_STAGES = [
  "queued",
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
  "completed",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/** Execution context — production vs synthetic load-test/demo. */
export const WORKFLOW_MODES = ["production", "stress", "demo"] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

/** True for any non-production (synthetic) run — mirrors the generated
 *  is_simulation DB column so app and DB always agree. */
export function isSimulationMode(mode: WorkflowMode): boolean {
  return mode !== "production";
}

// Allowed status transitions. Terminal states have no successors.
const NEXT_STATUS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  queued: ["running", "cancelled", "failed"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

/** Whether a run may move from `from` to `to`. Same-state is idempotent (true). */
export function isValidStatusTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true;
  return NEXT_STATUS[from]?.includes(to) ?? false;
}

export function isTerminalStatus(status: WorkflowStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

/** Clamp progress to the valid 0..100 integer range. */
export function clampProgress(n: number | null | undefined): number {
  if (n === null || n === undefined || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Keys/patterns that must never be written to the observable event log.
const FORBIDDEN_META_KEYS = [
  "resume", "resumetext", "resume_text", "cv", "coverletter", "cover_letter",
  "letter", "interview", "apikey", "api_key", "token", "secret", "password",
  "authorization", "auth", "email", "phone", "address", "ssn", "key",
];
const MAX_META_STRING = 300;

/**
 * Strip any PII / secrets / large free-text blobs from event metadata before it
 * is persisted. Only compact, non-sensitive telemetry (counts, ids, codes,
 * flags, short labels) survives. Résumé text, cover-letter text, interview
 * questions, API keys and tokens can never reach the event log.
 */
export function sanitizeEventMetadata(
  meta: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!meta || typeof meta !== "object") return out;
  for (const [k, v] of Object.entries(meta)) {
    const kl = k.toLowerCase();
    if (FORBIDDEN_META_KEYS.some((f) => kl.includes(f))) continue;
    if (typeof v === "string") {
      if (v.length > MAX_META_STRING) continue; // no large text blobs
      out[k] = v;
    } else if (
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null ||
      Array.isArray(v)
    ) {
      out[k] = v;
    }
    // objects are dropped to avoid nested PII leaks
  }
  return out;
}
