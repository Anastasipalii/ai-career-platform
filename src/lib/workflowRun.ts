// ============================================================================
// workflowRun — Supabase persistence for AI Workflow runs (Phase 1 lifecycle)
// ----------------------------------------------------------------------------
// Uses the existing browser Supabase client under the user's session, so RLS
// enforces owner-only access (no service-role key on the client). Every call is
// best-effort and returns a STRUCTURED result — database errors are surfaced,
// never silently swallowed, and never carry stack traces or secrets.
//
// Reads use select("*") + a JS mode filter so they work BOTH before and after
// the Phase 1 migration is applied (existing history stays readable either way).
// ============================================================================

import { supabase } from "./supabase";

export type ResultSource = "live-ai" | "demo-fallback";

/** Where a run is executed. Keeps production data cleanly separated from
 *  stress-test traffic and demo/sample runs. */
export type WorkflowMode = "production" | "stress" | "demo";

/** Lifecycle state of a run. */
export type WorkflowStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

/** Structured result — callers can branch on `ok` without try/catch, and the
 *  error carries a safe code + human message (no stack traces / secrets). */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/** Master resume analysis (mirrors /api/resume/analyze) — the single,
 *  profession-agnostic source of truth that drives every downstream module. */
export interface ResumeAnalysis {
  // Master profile (detected from the resume — never assumed).
  profession: string;
  specialization: string;
  seniority: string;
  industries: string[];
  softSkills: string[];
  careerGoals: string[];
  // Skills / scoring.
  detectedSkills: string[];
  detectedLanguages: string[];
  experienceSummary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  atsScore: number;
  recommendations: string[];
}

/** Structured cover letter (mirrors /api/cover-letter/agent). */
export interface CoverLetterResult {
  title: string;
  coverLetter: string;
  matchingKeywords: string[];
  toneSuggestions: string[];
}

/** A single job match (mirrors /api/job-match/agent + the workflow outputs).
 *  For real provider jobs the identity fields (externalId/provider/company/
 *  sourceUrl/applyUrl) come straight from the provider and are preserved through
 *  ranking and persistence — the AI only adds score/explanation/skills. */
export interface WorkflowJobMatch {
  title: string;
  company?: string;
  matchScore: number;
  whyMatch: string;
  /** 2–3 resume strengths this role builds on (optional; local recommendations). */
  matchedStrengths?: string[];
  missingSkills: string[];
  recommendedSkills: string[];
  // ── Real-provider identity (present for live jobs; preserved end-to-end) ──
  externalId?: string;
  provider?: string;
  location?: string | null;
  remote?: boolean;
  jobTypes?: string[];
  sourceUrl?: string;
  applyUrl?: string;
  publishedAt?: string | null;
  /** True only for stress/demo synthetic matches — never for production. */
  synthetic?: boolean;
}

/** Payload written to the workflow_runs table by the legacy one-shot save. */
export interface WorkflowRunInput {
  /** Idempotency key — reusing the same value never creates a duplicate run. */
  runKey?: string;
  mode?: WorkflowMode;
  resumeName: string;
  resumePreview: string;
  analysis: ResumeAnalysis;
  atsScore: number;
  coverLetter: CoverLetterResult;
  jobMatch: Record<string, unknown>;
  interview: Record<string, unknown>;
  source: ResultSource;
  completedAt: string; // ISO
}

/** Row shape read back from workflow_runs. Original columns are required for the
 *  Dashboard; lifecycle columns are optional so rows written before the Phase 1
 *  migration (which lack them) still type-check. */
export interface WorkflowRunRow {
  resume_name: string | null;
  resume_preview: string | null;
  analysis: ResumeAnalysis | null;
  ats_score: number | null;
  cover_letter: CoverLetterResult | null;
  job_match: Record<string, unknown> | null;
  interview: Record<string, unknown> | null;
  source: ResultSource | null;
  completed_at: string;
  // ── Phase 1 lifecycle (present after the migration) ──
  id?: string;
  run_key?: string;
  user_id?: string;
  mode?: WorkflowMode;
  status?: WorkflowStatus;
  current_step?: string | null;
  progress?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  updated_at?: string | null;
  created_at?: string;
}

/** Params for a single observable event row. */
export interface WorkflowEventInput {
  runId: string;
  mode?: WorkflowMode;
  step?: string;
  status?: WorkflowStatus | string;
  progress?: number;
  message?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

const clampScore = (n: number): number => Math.min(100, Math.max(0, Math.round(n || 0)));
const clampProgress = (n: number | undefined): number | undefined =>
  n === undefined ? undefined : Math.min(100, Math.max(0, Math.round(n)));

/** Build a structured error without leaking stack traces or secrets. */
function fail<T = never>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

/** Normalize a Supabase/unknown error into a safe { code, message }. */
function toSafeError(e: unknown, fallbackCode: string): { code: string; message: string } {
  const obj = (e ?? {}) as { code?: string; message?: string };
  const code = typeof obj.code === "string" && obj.code ? obj.code : fallbackCode;
  const message =
    typeof obj.message === "string" && obj.message ? obj.message : "Database request failed.";
  return { code, message };
}

/** Current user id, or null when there is no session (RLS requires it). */
async function getSessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

// ── Lifecycle API ───────────────────────────────────────────────────────────

/**
 * Create (or idempotently reuse) a workflow run. Reusing the same `runKey`
 * NEVER creates a duplicate — it returns the existing run's id instead.
 */
export async function createWorkflowRun(params: {
  runKey: string;
  mode?: WorkflowMode;
  status?: WorkflowStatus;
  currentStep?: string;
  resumeName?: string;
  resumePreview?: string;
  source?: ResultSource;
}): Promise<Result<{ id: string; runKey: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not persisted.");

  try {
    // Idempotent insert: on run_key conflict, keep the existing row.
    const { error: upsertError } = await supabase
      .from("workflow_runs")
      .upsert(
        {
          user_id: uid,
          run_key: params.runKey,
          mode: params.mode ?? "production",
          status: params.status ?? "running",
          current_step: params.currentStep ?? "queued",
          progress: 0,
          resume_name: params.resumeName ?? null,
          resume_preview: params.resumePreview ?? null,
          source: params.source ?? "demo-fallback",
          started_at: new Date().toISOString(),
        },
        { onConflict: "run_key", ignoreDuplicates: true }
      );
    if (upsertError) {
      const e = toSafeError(upsertError, "insert_failed");
      console.warn("[workflowRun] createWorkflowRun insert failed:", e.code, e.message);
      return { ok: false, error: e };
    }

    // Fetch the id (whether just inserted or pre-existing) for event logging.
    const { data, error: selError } = await supabase
      .from("workflow_runs")
      .select("id, run_key")
      .eq("run_key", params.runKey)
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (selError) {
      const e = toSafeError(selError, "select_failed");
      console.warn("[workflowRun] createWorkflowRun lookup failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    if (!data?.id) return fail("not_found", "Run could not be created or located.");
    return { ok: true, data: { id: data.id as string, runKey: params.runKey } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] createWorkflowRun error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

/** Advance a run's status / current step / progress. */
export async function updateWorkflowRunStatus(params: {
  runKey: string;
  status?: WorkflowStatus;
  currentStep?: string;
  progress?: number;
}): Promise<Result<{ runKey: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not updated.");

  const patch: Record<string, unknown> = {};
  if (params.status !== undefined) patch.status = params.status;
  if (params.currentStep !== undefined) patch.current_step = params.currentStep;
  const p = clampProgress(params.progress);
  if (p !== undefined) patch.progress = p;
  if (Object.keys(patch).length === 0) return { ok: true, data: { runKey: params.runKey } };

  try {
    const { error } = await supabase
      .from("workflow_runs")
      .update(patch)
      .eq("run_key", params.runKey)
      .eq("user_id", uid);
    if (error) {
      const e = toSafeError(error, "update_failed");
      console.warn("[workflowRun] updateWorkflowRunStatus failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    return { ok: true, data: { runKey: params.runKey } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] updateWorkflowRunStatus error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

/** Append one row to the observable workflow_events log. */
export async function recordWorkflowEvent(
  event: WorkflowEventInput
): Promise<Result<{ id: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; event not recorded.");

  try {
    const { data, error } = await supabase
      .from("workflow_events")
      .insert({
        run_id: event.runId,
        user_id: uid,
        mode: event.mode ?? "production",
        step: event.step ?? null,
        status: event.status ?? null,
        progress: clampProgress(event.progress) ?? null,
        message: event.message ?? null,
        duration_ms: event.durationMs ?? null,
        metadata: event.metadata ?? {},
      })
      .select("id")
      .single();
    if (error) {
      const e = toSafeError(error, "event_insert_failed");
      console.warn("[workflowRun] recordWorkflowEvent failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] recordWorkflowEvent error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

/** Mark a run completed and store its results; also logs a completion event. */
export async function completeWorkflowRun(params: {
  runKey: string;
  analysis?: ResumeAnalysis | null;
  atsScore?: number;
  coverLetter?: CoverLetterResult | Record<string, unknown> | null;
  jobMatch?: Record<string, unknown> | null;
  interview?: Record<string, unknown> | null;
  source?: ResultSource;
}): Promise<Result<{ id: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not completed.");

  const patch: Record<string, unknown> = {
    status: "completed",
    current_step: "completed",
    progress: 100,
    completed_at: new Date().toISOString(),
  };
  if (params.analysis !== undefined) patch.analysis = params.analysis ?? {};
  if (params.atsScore !== undefined) patch.ats_score = clampScore(params.atsScore);
  if (params.coverLetter !== undefined) patch.cover_letter = params.coverLetter ?? {};
  if (params.jobMatch !== undefined) patch.job_match = params.jobMatch ?? {};
  if (params.interview !== undefined) patch.interview = params.interview ?? {};
  if (params.source !== undefined) patch.source = params.source;

  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .update(patch)
      .eq("run_key", params.runKey)
      .eq("user_id", uid)
      .select("id, mode")
      .maybeSingle();
    if (error) {
      const e = toSafeError(error, "complete_failed");
      console.warn("[workflowRun] completeWorkflowRun failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    if (!data?.id) return fail("not_found", "Run to complete was not found.");

    // Best-effort event (never overrides the completion result).
    await recordWorkflowEvent({
      runId: data.id as string,
      mode: (data.mode as WorkflowMode) ?? "production",
      step: "completed",
      status: "completed",
      progress: 100,
      message: "Workflow run completed.",
      metadata: { source: params.source ?? null },
    });
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] completeWorkflowRun error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

/** Mark a run failed with a safe error code/message; also logs a failure event. */
export async function failWorkflowRun(params: {
  runKey: string;
  errorCode: string;
  errorMessage: string;
  currentStep?: string;
}): Promise<Result<{ id: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not marked failed.");

  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .update({
        status: "failed",
        current_step: params.currentStep ?? "failed",
        error_code: params.errorCode,
        error_message: params.errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("run_key", params.runKey)
      .eq("user_id", uid)
      .select("id, mode")
      .maybeSingle();
    if (error) {
      const e = toSafeError(error, "fail_update_failed");
      console.warn("[workflowRun] failWorkflowRun failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    if (!data?.id) return fail("not_found", "Run to fail was not found.");

    await recordWorkflowEvent({
      runId: data.id as string,
      mode: (data.mode as WorkflowMode) ?? "production",
      step: params.currentStep ?? "failed",
      status: "failed",
      message: params.errorMessage,
      metadata: { errorCode: params.errorCode },
    });
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] failWorkflowRun error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

// ── Legacy one-shot save (kept so the current pipeline is unchanged) ──────────

/**
 * Persist a completed run in a single idempotent write, and log one completion
 * event. Reusing the same `runKey` updates that row instead of duplicating it.
 * Returns { ok } for backward compatibility with the existing call site.
 */
export async function saveWorkflowRun(input: WorkflowRunInput): Promise<{ ok: boolean }> {
  const uid = await getSessionUserId();
  if (!uid) {
    console.log("[CareerAI] workflow_runs save SKIPPED — no session (Dashboard uses localStorage).");
    return { ok: false };
  }

  const runKey =
    input.runKey ??
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`);
  const mode: WorkflowMode = input.mode ?? "production";

  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .upsert(
        {
          user_id: uid,
          run_key: runKey,
          mode,
          status: "completed",
          current_step: "completed",
          progress: 100,
          resume_name: input.resumeName,
          resume_preview: input.resumePreview,
          analysis: input.analysis,
          ats_score: clampScore(input.atsScore),
          cover_letter: input.coverLetter,
          job_match: input.jobMatch,
          interview: input.interview,
          source: input.source,
          started_at: input.completedAt,
          completed_at: input.completedAt,
        },
        { onConflict: "run_key" }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn(
        "[CareerAI] workflow_runs save FAILED:",
        error.code ?? "",
        error.message,
        "(apply supabase/phase1_workflow_lifecycle.sql?). Dashboard uses localStorage."
      );
      return { ok: false };
    }

    if (data?.id) {
      // Best-effort observable event; failure never blocks the save result.
      await recordWorkflowEvent({
        runId: data.id as string,
        mode,
        step: "completed",
        status: "completed",
        progress: 100,
        message: "Run completed and synced to dashboard.",
        metadata: { source: input.source },
      });
    }
    console.log("[CareerAI] workflow_runs save OK → runKey:", runKey, "| source:", input.source);
    return { ok: true };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[CareerAI] workflow_runs save error:", err.code, err.message);
    return { ok: false };
  }
}

// ── Reads (tolerant of pre-/post-migration schema) ───────────────────────────

/** Read the most recent runs (newest first), excluding stress-test traffic.
 *  Uses select("*") so it works whether or not the Phase 1 columns exist yet. */
export async function readRecentWorkflowRuns(limit = 10): Promise<WorkflowRunRow[]> {
  try {
    const uid = await getSessionUserId();
    if (!uid) return [];

    const { data, error } = await supabase
      .from("workflow_runs")
      .select("*")
      .eq("user_id", uid)
      .order("completed_at", { ascending: false })
      .limit(Math.max(1, limit) * 2); // fetch extra, then drop stress rows in JS

    if (error) {
      console.warn("[workflowRun] readRecentWorkflowRuns failed:", error.code ?? "", error.message);
      return [];
    }
    const rows = (data ?? []) as WorkflowRunRow[];
    // Keep production + demo; hide stress-test runs. Rows written before the
    // migration have no `mode` and are treated as production (kept).
    return rows.filter((r) => r.mode !== "stress").slice(0, limit);
  } catch {
    return [];
  }
}

/** Read the most recent run for the current user, or null if none/unavailable. */
export async function readLatestWorkflowRun(): Promise<WorkflowRunRow | null> {
  const rows = await readRecentWorkflowRuns(1);
  return rows[0] ?? null;
}
