// ============================================================================
// workflowRun — Supabase persistence for completed AI Workflow runs
// ----------------------------------------------------------------------------
// Writes/reads a single row in the additive `workflow_runs` table using the
// existing browser Supabase client under the user's session (RLS enforced,
// same as every other feature). Every call is best-effort and wrapped in
// try/catch — a failure NEVER blocks the UI; the caller falls back to
// localStorage. No auth changes, no service role, no env changes.
// ============================================================================

import { supabase } from "./supabase";

export type ResultSource = "live-ai" | "demo-fallback";

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

/** A single job match (mirrors /api/job-match/agent + the workflow outputs). */
export interface WorkflowJobMatch {
  title: string;
  company?: string;
  matchScore: number;
  whyMatch: string;
  /** 2–3 resume strengths this role builds on (optional; local recommendations). */
  matchedStrengths?: string[];
  missingSkills: string[];
  recommendedSkills: string[];
}

/** Payload written to the workflow_runs table. */
export interface WorkflowRunInput {
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

/** Row shape read back from workflow_runs. */
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
}

const clampScore = (n: number): number => Math.min(100, Math.max(0, Math.round(n || 0)));

/** Persist a run. Returns { ok } — false when there is no session or the write fails. */
export async function saveWorkflowRun(input: WorkflowRunInput): Promise<{ ok: boolean }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("[CareerAI] 7. workflow_runs insert SKIPPED — no Supabase session (Dashboard will use localStorage).");
      return { ok: false };
    }

    const { error } = await supabase.from("workflow_runs").insert({
      user_id: session.user.id,
      resume_name: input.resumeName,
      resume_preview: input.resumePreview,
      analysis: input.analysis,
      ats_score: clampScore(input.atsScore),
      cover_letter: input.coverLetter,
      job_match: input.jobMatch,
      interview: input.interview,
      source: input.source,
      completed_at: input.completedAt,
    });
    if (error) {
      console.log("[CareerAI] 7. workflow_runs insert FAILED:", error.message, "(table missing? run the migration). Dashboard will use localStorage.");
    } else {
      console.log("[CareerAI] 7. workflow_runs insert OK → source:", input.source, "| completedAt:", input.completedAt);
    }
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** Read the most recent run for the current user, or null if none/unavailable. */
export async function readLatestWorkflowRun(): Promise<WorkflowRunRow | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from("workflow_runs")
      .select(
        "resume_name, resume_preview, analysis, ats_score, cover_letter, job_match, interview, source, completed_at"
      )
      .eq("user_id", session.user.id)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0] as WorkflowRunRow;
  } catch {
    return null;
  }
}

/** Read the most recent runs (newest first) so the Dashboard can show the
 *  latest run in its widgets while keeping previous runs visible in history.
 *  Each Run Pipeline is a separate row — this never overwrites earlier runs. */
export async function readRecentWorkflowRuns(limit = 10): Promise<WorkflowRunRow[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from("workflow_runs")
      .select(
        "resume_name, resume_preview, analysis, ats_score, cover_letter, job_match, interview, source, completed_at"
      )
      .eq("user_id", session.user.id)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as WorkflowRunRow[];
  } catch {
    return [];
  }
}
