// ============================================================================
// workflowResults — frontend-only mock persistence for the demo
// ----------------------------------------------------------------------------
// Bridges the AI Workflow pipeline and the Dashboard WITHOUT a backend. When a
// pipeline run completes it writes a small result summary to localStorage; the
// Dashboard reads it on mount and surfaces it as recent activity + stats.
//
// This is intentionally lightweight and disposable — no Supabase, no network.
// A later phase can swap these helpers for real persistence without touching
// the call sites.
// ============================================================================

import type { WorkflowJobMatch } from "./workflowRun";

/** localStorage key for the most recent completed pipeline run. */
export const WORKFLOW_RESULTS_KEY = "careerai:workflow-results";

/** Where a run's results came from. */
export type WorkflowResultSource = "live-ai" | "demo-fallback";

/** Summary of one completed pipeline run. */
export interface WorkflowResults {
  /** The resume was ATS-optimized during the run. */
  resumeOptimized: boolean;
  /** Final ATS score (0–100). */
  atsScore: number;
  /** A tailored cover letter was generated. */
  coverLetterGenerated: boolean;
  /** Role/company the cover letter targeted (for nicer copy). */
  coverLetterRole?: string;
  coverLetterCompany?: string;
  /** Number of job matches surfaced. */
  jobMatchesCount: number;
  /** A mock interview session was created. */
  interviewSessionCreated: boolean;
  /** Number of follow-up tasks created. */
  tasksCreated: number;
  /** ISO timestamp of when the run finished. */
  completedAt: string;

  // ── Optional real-AI fields (added additively; older records omit them) ──
  /** Whether results came from live AI or the demo fallback. */
  source?: WorkflowResultSource;
  /** Name of the resume used (file name or "Pasted resume"). */
  resumeName?: string;
  /** Short preview of the resume text. */
  resumePreview?: string;
  /** Title of the generated cover letter. */
  coverLetterTitle?: string;
  /** Full generated cover letter text (so the Dashboard can display it). */
  coverLetterText?: string;
  /** Top job matches from the run (so the Dashboard can display them). */
  jobMatches?: WorkflowJobMatch[];
}

/** True only in a browser with a usable localStorage. */
function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Persist a completed run. Safe to call anywhere; no-ops on the server. */
export function saveWorkflowResults(results: WorkflowResults): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(WORKFLOW_RESULTS_KEY, JSON.stringify(results));
  } catch {
    // Storage unavailable (private mode, quota) — non-fatal for a demo.
  }
}

/** Read the last completed run, or null if none/invalid. */
export function readWorkflowResults(): WorkflowResults | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(WORKFLOW_RESULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkflowResults>;
    // Minimal shape validation — ignore anything malformed.
    if (typeof parsed?.completedAt !== "string") return null;
    return {
      resumeOptimized: Boolean(parsed.resumeOptimized),
      atsScore: Number(parsed.atsScore ?? 0),
      coverLetterGenerated: Boolean(parsed.coverLetterGenerated),
      coverLetterRole: parsed.coverLetterRole,
      coverLetterCompany: parsed.coverLetterCompany,
      jobMatchesCount: Number(parsed.jobMatchesCount ?? 0),
      interviewSessionCreated: Boolean(parsed.interviewSessionCreated),
      tasksCreated: Number(parsed.tasksCreated ?? 0),
      completedAt: parsed.completedAt,
      source: parsed.source,
      resumeName: parsed.resumeName,
      resumePreview: parsed.resumePreview,
      coverLetterTitle: parsed.coverLetterTitle,
      coverLetterText: parsed.coverLetterText,
      jobMatches: Array.isArray(parsed.jobMatches) ? parsed.jobMatches : undefined,
    };
  } catch {
    return null;
  }
}

/** Remove any stored run. */
export function clearWorkflowResults(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(WORKFLOW_RESULTS_KEY);
  } catch {
    // ignore
  }
}
