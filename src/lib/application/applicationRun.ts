// ============================================================================
// application/applicationRun — best-effort persistence for DRY-RUN applications
// ----------------------------------------------------------------------------
// Writes ONLY safe metadata to public.application_runs / application_events
// (see supabase/part_a_application_dry_run.sql). Never stores résumé text,
// cover-letter text, prompts, secrets, or PII. `is_dry_run` is hardcoded true
// and the DB CHECK enforces it, so a non-dry-run row cannot exist. All writes
// are best-effort (no session / missing table → silent no-op); all reads return
// [] on error. This module performs NO external submission of any kind.
// ============================================================================

import { supabase } from "@/lib/supabase";
import {
  APPLICATION_STAGES,
  IS_DRY_RUN,
  type ApplicationStage,
  type ApplicationStatus,
} from "@/lib/application/types";

export interface ApplicationRunRow {
  id?: string;
  application_run_key?: string;
  user_id?: string;
  workflow_run_id?: string | null;
  job_id?: string | null;
  job_title?: string | null;
  company?: string | null;
  provider?: string | null;
  external_url?: string | null;
  status?: ApplicationStatus | null;
  current_step?: string | null;
  progress?: number | null;
  is_dry_run?: boolean | null;
  validation_result?: Record<string, unknown> | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  created_at?: string;
}

export interface ApplicationEventRow {
  id: string;
  run_id: string;
  stage: string | null;
  status: string | null;
  progress: number | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  is_dry_run: boolean | null;
  created_at: string;
}

const DRY_RUN_MODE = "dry_run";

async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export function newApplicationRunKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create the dry-run application row (status running). Best-effort. */
export async function createApplicationRun(params: {
  applicationRunKey: string;
  workflowRunId?: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  provider?: string;
  externalUrl?: string;
}): Promise<{ ok: boolean; id: string | null }> {
  const uid = await sessionUserId();
  if (!uid) return { ok: false, id: null };
  try {
    const { data, error } = await supabase
      .from("application_runs")
      .insert({
        application_run_key: params.applicationRunKey,
        user_id: uid,
        workflow_run_id: params.workflowRunId ?? null,
        job_id: params.jobId ?? null,
        job_title: params.jobTitle ?? null,
        company: params.company ?? null,
        provider: params.provider ?? null,
        external_url: params.externalUrl ?? null,
        status: "running",
        current_step: "application_started",
        progress: 0,
        is_dry_run: IS_DRY_RUN, // always true; DB CHECK blocks anything else
        started_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[applicationRun] create failed:", error.code ?? "", error.message);
      return { ok: false, id: null };
    }
    return { ok: true, id: (data?.id as string) ?? null };
  } catch {
    return { ok: false, id: null };
  }
}

/** Append a safe stage event (metadata only). Append-only, best-effort. */
export async function recordApplicationStage(params: {
  runId: string;
  stage: ApplicationStage;
  status: "running" | "completed" | "failed";
  progress?: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
}): Promise<void> {
  const uid = await sessionUserId();
  if (!uid) return;
  try {
    await supabase.from("application_events").insert({
      run_id: params.runId,
      user_id: uid,
      mode: DRY_RUN_MODE,
      stage: params.stage,
      status: params.status,
      progress: params.progress ?? null,
      duration_ms: params.durationMs ?? null,
      started_at: params.startedAt ?? null,
      completed_at: params.completedAt ?? null,
      is_dry_run: IS_DRY_RUN,
    });
  } catch {
    /* best-effort */
  }
}

/** Mark the dry-run application completed with its validation result. */
export async function completeApplicationRun(params: {
  applicationRunKey: string;
  durationMs?: number;
  validationResult?: Record<string, unknown>;
}): Promise<void> {
  const uid = await sessionUserId();
  if (!uid) return;
  try {
    await supabase
      .from("application_runs")
      .update({
        status: "completed",
        current_step: "dry_run_completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        duration_ms: params.durationMs ?? null,
        validation_result: params.validationResult ?? null,
      })
      .eq("application_run_key", params.applicationRunKey)
      .eq("user_id", uid);
  } catch {
    /* best-effort */
  }
}

/** Mark the dry-run application failed (validation or persistence issue). */
export async function failApplicationRun(params: {
  applicationRunKey: string;
  currentStep?: string;
  durationMs?: number;
  validationResult?: Record<string, unknown>;
}): Promise<void> {
  const uid = await sessionUserId();
  if (!uid) return;
  try {
    await supabase
      .from("application_runs")
      .update({
        status: "failed",
        current_step: params.currentStep ?? "failed",
        completed_at: new Date().toISOString(),
        duration_ms: params.durationMs ?? null,
        validation_result: params.validationResult ?? null,
      })
      .eq("application_run_key", params.applicationRunKey)
      .eq("user_id", uid);
  } catch {
    /* best-effort */
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────

/** The current user's own recent dry-run applications (Dashboard section). */
export async function readRecentApplicationRuns(limit = 10): Promise<ApplicationRunRow[]> {
  const uid = await sessionUserId();
  if (!uid) return [];
  try {
    const { data, error } = await supabase
      .from("application_runs")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, limit));
    if (error) return [];
    return (data ?? []) as ApplicationRunRow[];
  } catch {
    return [];
  }
}

/** Admin: all dry-run applications (RLS admin policy returns all). */
export async function readAllApplicationRunsAdmin(limit = 500): Promise<ApplicationRunRow[]> {
  try {
    const { data, error } = await supabase
      .from("application_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(1000, Math.max(1, limit)));
    if (error) return [];
    return (data ?? []) as ApplicationRunRow[];
  } catch {
    return [];
  }
}

/** Admin/user: the chronological safe event timeline for one application run. */
export async function readApplicationEventsForRun(runId: string, limit = 200): Promise<ApplicationEventRow[]> {
  if (!runId) return [];
  try {
    const { data, error } = await supabase
      .from("application_events")
      .select("id, run_id, stage, status, progress, duration_ms, started_at, completed_at, is_dry_run, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .limit(Math.min(1000, Math.max(1, limit)));
    if (error) return [];
    return (data ?? []) as ApplicationEventRow[];
  } catch {
    return [];
  }
}

/** Guard used by callers/tests: the canonical stage order. */
export const APPLICATION_STAGE_ORDER: readonly ApplicationStage[] = APPLICATION_STAGES;
