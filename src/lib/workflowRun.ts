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
import { sanitizeEventMetadata, type WorkflowStage } from "@/lib/workflow/stages";
import { sanitizeForDb } from "@/lib/dbSafe";

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
  // ── Part B/C monitoring + simulation (present after part_bc migration) ──
  profession?: string | null;
  resume_language?: string | null;
  duration_ms?: number | null;
  jobs_found?: number | null;
  retry_count?: number | null;
  simulation_user_id?: string | null;
  is_simulation?: boolean | null;
}

/** Params for a single observable event row. */
export interface WorkflowEventInput {
  runId: string;
  mode?: WorkflowMode;
  /** Canonical stage name; falls back to `step` for legacy callers. */
  stage?: WorkflowStage;
  step?: string;
  status?: WorkflowStatus | string;
  progress?: number;
  message?: string;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
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
  profession?: string;
  resumeLanguage?: string;
  /** Synthetic identity for load-test runs. Never a real auth user id. */
  simulationUserId?: string;
}): Promise<Result<{ id: string; runKey: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not persisted.");

  try {
    // Idempotent insert: on run_key conflict, keep the existing row.
    const { error: upsertError } = await supabase
      .from("workflow_runs")
      .upsert(
        sanitizeForDb({
          user_id: uid,
          run_key: params.runKey,
          mode: params.mode ?? "production",
          status: params.status ?? "running",
          current_step: params.currentStep ?? "queued",
          progress: 0,
          resume_name: params.resumeName ?? null,
          resume_preview: params.resumePreview ?? null,
          source: params.source ?? "demo-fallback",
          profession: params.profession ?? null,
          resume_language: params.resumeLanguage ?? null,
          simulation_user_id: params.simulationUserId ?? null,
          started_at: new Date().toISOString(),
        }),
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
      .update(sanitizeForDb(patch))
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
      .insert(sanitizeForDb({
        run_id: event.runId,
        user_id: uid,
        mode: event.mode ?? "production",
        step: event.stage ?? event.step ?? null,
        status: event.status ?? null,
        progress: clampProgress(event.progress) ?? null,
        message: event.message ?? null,
        duration_ms: event.durationMs ?? null,
        started_at: event.startedAt ?? null,
        completed_at: event.completedAt ?? null,
        error_code: event.errorCode ?? null,
        error_message: event.errorMessage ?? null,
        metadata: sanitizeEventMetadata(event.metadata),
      }))
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
  profession?: string;
  resumeLanguage?: string;
  durationMs?: number;
  jobsFound?: number;
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
  if (params.profession !== undefined) patch.profession = params.profession;
  if (params.resumeLanguage !== undefined) patch.resume_language = params.resumeLanguage;
  if (params.durationMs !== undefined) patch.duration_ms = Math.max(0, Math.round(params.durationMs));
  if (params.jobsFound !== undefined) patch.jobs_found = Math.max(0, Math.round(params.jobsFound));

  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .update(sanitizeForDb(patch))
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
  /** Real measured run duration (start→failure), persisted when provided. */
  durationMs?: number;
}): Promise<Result<{ id: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not marked failed.");

  try {
    const patch: Record<string, unknown> = {
      status: "failed",
      current_step: params.currentStep ?? "failed",
      error_code: params.errorCode,
      error_message: params.errorMessage,
      completed_at: new Date().toISOString(),
    };
    if (params.durationMs !== undefined) patch.duration_ms = Math.max(0, Math.round(params.durationMs));
    const { data, error } = await supabase
      .from("workflow_runs")
      .update(sanitizeForDb(patch))
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

/** Mark a run cancelled (e.g. an aborted simulation); logs a cancellation event. */
export async function cancelWorkflowRun(params: {
  runKey: string;
  reason?: string;
  currentStep?: string;
}): Promise<Result<{ id: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return fail("no_session", "No authenticated session; run not cancelled.");

  try {
    const { data, error } = await supabase
      .from("workflow_runs")
      .update({
        status: "cancelled",
        current_step: params.currentStep ?? "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("run_key", params.runKey)
      .eq("user_id", uid)
      .select("id, mode")
      .maybeSingle();
    if (error) {
      const e = toSafeError(error, "cancel_failed");
      console.warn("[workflowRun] cancelWorkflowRun failed:", e.code, e.message);
      return { ok: false, error: e };
    }
    if (!data?.id) return fail("not_found", "Run to cancel was not found.");

    await recordWorkflowEvent({
      runId: data.id as string,
      mode: (data.mode as WorkflowMode) ?? "production",
      step: params.currentStep ?? "cancelled",
      status: "cancelled",
      message: params.reason ?? "Workflow run cancelled.",
    });
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    const err = toSafeError(e, "unexpected");
    console.warn("[workflowRun] cancelWorkflowRun error:", err.code, err.message);
    return { ok: false, error: err };
  }
}

// ── Stage-event helpers (thin wrappers over recordWorkflowEvent) ──────────────
// A stage is observed as a pair of append-only events: one "running" when it
// starts and one terminal ("completed" | "failed") when it ends. Nothing here
// mutates a prior row — the timeline stays append-only.

/** Log the start of a stage. Returns the started_at timestamp for duration math. */
export async function startStageEvent(params: {
  runId: string;
  stage: WorkflowStage;
  mode?: WorkflowMode;
  progress?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<Result<{ id: string; startedAt: string }>> {
  const startedAt = new Date().toISOString();
  const res = await recordWorkflowEvent({
    runId: params.runId,
    mode: params.mode,
    stage: params.stage,
    status: "running",
    progress: params.progress,
    message: params.message,
    startedAt,
    metadata: params.metadata,
  });
  if (!res.ok) return res;
  return { ok: true, data: { id: res.data.id, startedAt } };
}

/** Log the successful end of a stage, deriving duration from `startedAt`. */
export async function completeStageEvent(params: {
  runId: string;
  stage: WorkflowStage;
  mode?: WorkflowMode;
  startedAt?: string;
  progress?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<Result<{ id: string }>> {
  const completedAt = new Date().toISOString();
  const durationMs = params.startedAt
    ? Math.max(0, Date.parse(completedAt) - Date.parse(params.startedAt))
    : undefined;
  return recordWorkflowEvent({
    runId: params.runId,
    mode: params.mode,
    stage: params.stage,
    status: "completed",
    progress: params.progress,
    message: params.message,
    startedAt: params.startedAt,
    completedAt,
    durationMs,
    metadata: params.metadata,
  });
}

/** Log the failure of a stage with a safe error code/message. */
export async function failStageEvent(params: {
  runId: string;
  stage: WorkflowStage;
  mode?: WorkflowMode;
  startedAt?: string;
  errorCode: string;
  errorMessage: string;
  metadata?: Record<string, unknown>;
}): Promise<Result<{ id: string }>> {
  const completedAt = new Date().toISOString();
  const durationMs = params.startedAt
    ? Math.max(0, Date.parse(completedAt) - Date.parse(params.startedAt))
    : undefined;
  return recordWorkflowEvent({
    runId: params.runId,
    mode: params.mode,
    stage: params.stage,
    status: "failed",
    message: params.errorMessage,
    startedAt: params.startedAt,
    completedAt,
    durationMs,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    metadata: params.metadata,
  });
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
        sanitizeForDb({
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
        }),
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

// ── Admin-scoped monitoring reads (RLS-gated) ────────────────────────────────
// These are for the admin Monitoring Dashboard ONLY. Unlike readRecentWorkflowRuns
// they are NOT user-scoped and do NOT hide stress runs — an admin needs to see
// every run across all users, including simulations. Row visibility is enforced
// by RLS: the admin SELECT-all policies (using is_admin(), backed by app_admins)
// return all rows for admins; for a non-admin these queries return only their
// own rows (fail-safe), and the page is additionally gated by checkAdminAccess.
// They are READ-ONLY and never trigger any generation/provider/email/apply path.

/** A single observable workflow_event row (safe, non-PII projection). */
export interface WorkflowEventRow {
  id: string;
  run_id: string;
  mode: WorkflowMode | null;
  step: string | null;
  status: string | null;
  progress: number | null;
  message: string | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  is_simulation: boolean | null;
  created_at: string;
}

/** Optional server-side narrowing for the admin runs query. */
export interface AdminRunQuery {
  limit?: number;
  status?: WorkflowStatus;
  /** true = only simulations, false = only production; omit for all. */
  simulation?: boolean;
  profession?: string;
  resumeLanguage?: string;
  fromIso?: string;
  toIso?: string;
}

/** Read the latest runs across ALL users for admin monitoring (newest first).
 *  Capped (default 500) so the dashboard stays bounded; stats are computed over
 *  the loaded set. Returns [] on any error (never throws). */
/** Error-aware variant: returns { ok, rows } so callers (the monitoring
 *  dashboard) can distinguish a real read error from an empty result and keep
 *  the last known rows on failure. READ-ONLY; never deletes anything. */
export async function readAllWorkflowRunsAdminResult(
  q: AdminRunQuery = {}
): Promise<{ ok: boolean; rows: WorkflowRunRow[] }> {
  try {
    let query = supabase
      .from("workflow_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(1000, Math.max(1, q.limit ?? 500)));

    if (q.status) query = query.eq("status", q.status);
    if (q.simulation !== undefined) query = query.eq("is_simulation", q.simulation);
    if (q.profession) query = query.eq("profession", q.profession);
    if (q.resumeLanguage) query = query.eq("resume_language", q.resumeLanguage);
    if (q.fromIso) query = query.gte("created_at", q.fromIso);
    if (q.toIso) query = query.lte("created_at", q.toIso);

    const { data, error } = await query;
    if (error) {
      console.warn("[workflowRun] readAllWorkflowRunsAdmin failed:", error.code ?? "", error.message);
      return { ok: false, rows: [] };
    }
    return { ok: true, rows: (data ?? []) as WorkflowRunRow[] };
  } catch {
    return { ok: false, rows: [] };
  }
}

/** Back-compatible reader: latest runs across all users, [] on error. */
export async function readAllWorkflowRunsAdmin(q: AdminRunQuery = {}): Promise<WorkflowRunRow[]> {
  return (await readAllWorkflowRunsAdminResult(q)).rows;
}

/** Read the chronological event timeline for one run (admin monitoring).
 *  Selects only safe telemetry columns — no résumé/cover-letter/interview text
 *  and no metadata blob are returned. Returns [] on any error. */
export async function readWorkflowEventsForRun(
  runId: string,
  limit = 500
): Promise<WorkflowEventRow[]> {
  if (!runId) return [];
  try {
    const { data, error } = await supabase
      .from("workflow_events")
      .select(
        "id, run_id, mode, step, status, progress, message, duration_ms, started_at, completed_at, error_code, error_message, is_simulation, created_at"
      )
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .limit(Math.min(2000, Math.max(1, limit)));

    if (error) {
      console.warn("[workflowRun] readWorkflowEventsForRun failed:", error.code ?? "", error.message);
      return [];
    }
    return (data ?? []) as WorkflowEventRow[];
  } catch {
    return [];
  }
}
