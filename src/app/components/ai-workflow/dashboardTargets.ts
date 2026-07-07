// ============================================================================
// AI Workflow module — Dashboard output router (concept layer)
// ----------------------------------------------------------------------------
// The Dashboard is the user's personal workspace and is NOT modified here.
// This file only *declares* where a completed workflow's outputs are intended
// to land in the Dashboard. A later phase will actually persist run results to
// these Supabase tables; for now this powers the "Saves to Dashboard" UI and
// documents the contract between the two modules.
//
// Destinations intentionally match the entities the Dashboard already renders:
//   resumes · cover_letters · interview_sessions · job_matches
// plus a generic `task` bucket for automation outputs that don't map to an
// existing entity yet (e.g. a LinkedIn refresh or a daily digest).
// ============================================================================

/** The Dashboard destinations a workflow output can become. */
export type DashboardEntity =
  | "resume"
  | "cover_letter"
  | "job_match"
  | "interview_session"
  | "task";

export interface DashboardTarget {
  entity: DashboardEntity;
  /** Plural label as shown in the Dashboard, e.g. "Resumes". */
  label: string;
  /** Singular label for inline copy, e.g. "Resume". */
  singular: string;
  /** Supabase table the output will be written to in a later phase. */
  table: string;
  /** Where the user reviews this entity today. */
  dashboardHref: string;
  accent: { color: string; bg: string; border: string };
  /** True when the destination table does not exist in the app yet. */
  planned?: boolean;
  description: string;
}

// Accents echo the app's per-tool color language.
export const DASHBOARD_TARGETS: Record<DashboardEntity, DashboardTarget> = {
  resume: {
    entity: "resume",
    label: "Resumes",
    singular: "Resume",
    table: "resumes",
    dashboardHref: "/dashboard",
    accent: { color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.22)" },
    description: "Saved to your resume library and shown under Saved Resumes.",
  },
  cover_letter: {
    entity: "cover_letter",
    label: "Cover Letters",
    singular: "Cover Letter",
    table: "cover_letters",
    dashboardHref: "/dashboard",
    accent: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.22)" },
    description: "Filed under Saved Cover Letters, linked to the target role.",
  },
  job_match: {
    entity: "job_match",
    label: "Job Matches",
    singular: "Job Match",
    table: "job_matches",
    dashboardHref: "/dashboard",
    accent: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.22)" },
    description: "Ranked roles surface in the Job Matches widget with fit scores.",
  },
  interview_session: {
    entity: "interview_session",
    label: "Interview Sessions",
    singular: "Interview Session",
    table: "interview_sessions",
    dashboardHref: "/dashboard",
    accent: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.22)" },
    description: "Practice runs and scores appear in the Interview widget.",
  },
  task: {
    entity: "task",
    label: "Tasks",
    singular: "Task",
    table: "tasks",
    dashboardHref: "/dashboard",
    accent: { color: "#ec4899", bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.22)" },
    planned: true,
    description: "Generic automation output (new) — a follow-up item on your dashboard.",
  },
};

/**
 * Declares which Dashboard entities each workflow produces, keyed by slug.
 * Adding a workflow here is additive and does not require touching the
 * workflow registry or the Dashboard.
 */
export const WORKFLOW_OUTPUTS: Record<string, DashboardEntity[]> = {
  "tailored-application-kit": ["resume", "cover_letter"],
  "daily-job-digest": ["job_match", "task"],
  "interview-prep-loop": ["interview_session"],
  "linkedin-refresh": ["task"],
  "career-roadmap": ["task"],
};

/** Resolve a workflow slug to its ordered list of Dashboard targets. */
export function getWorkflowOutputs(slug: string): DashboardTarget[] {
  return (WORKFLOW_OUTPUTS[slug] ?? []).map((entity) => DASHBOARD_TARGETS[entity]);
}

/** The distinct destinations used across all workflows, in a stable order. */
export function getAllDashboardTargets(): DashboardTarget[] {
  const order: DashboardEntity[] = [
    "resume",
    "cover_letter",
    "job_match",
    "interview_session",
    "task",
  ];
  return order.map((e) => DASHBOARD_TARGETS[e]);
}
