// ============================================================================
// application/types — shared types for the DRY-RUN application preparation flow
// ----------------------------------------------------------------------------
// This whole feature prepares and validates an application package and runs a
// SAFE dry run. It NEVER submits anything: no employer API, no email, no browser
// automation, no webhook, no external POST. `IS_DRY_RUN` is always true and the
// DB enforces it with a CHECK constraint, so a real submission is technically
// impossible. Pure types + constants only (no imports).
// ============================================================================

/** Every application run is, and can only ever be, a dry run. */
export const IS_DRY_RUN = true as const;
/** The monitoring "mode" label for application runs. */
export const DRY_RUN_MODE = "dry_run" as const;

/** Ordered stages of the safe dry-run engine. */
export const APPLICATION_STAGES = [
  "application_started",
  "documents_validated",
  "candidate_data_prepared",
  "application_payload_created",
  "safety_check_completed",
  "dry_run_completed",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export type ApplicationStatus = "queued" | "running" | "completed" | "failed";
export type ReadinessStatus = "ready" | "needs_attention" | "not_ready";

/** The vacancy the user selected (real provider identity, no invented data). */
export interface ApplicationDraftJob {
  externalId?: string;
  title: string;
  company?: string;
  location?: string | null;
  provider?: string;
  jobTypes?: string[];
  employmentType?: string;
  sourceUrl?: string;
  matchScore: number;
}

/** Everything the preview needs, snapshotted client-side at selection time.
 *  Held only in the browser (localStorage) — never written verbatim to the DB. */
export interface ApplicationDraft {
  createdAt: string;
  /** run_key of the workflow run this application derives from (if any). */
  workflowRunId?: string;
  job: ApplicationDraftJob;
  atsScore: number;
  profession?: string;
  /** User-entered Target Profession this application's search ran against. */
  targetProfession?: string;
  resumeLanguage?: string;
  resumeName?: string;
  resumeAnalyzed: boolean;
  candidateProfilePresent: boolean;
  coverLetterPresent: boolean;
  /** Short preview shown on the preview page only; never persisted to events. */
  coverLetterPreview?: string;
}

/** Readiness checks that gate the Dry Run button. */
export interface ReadinessChecklist {
  resumeExists: boolean;
  resumeAnalyzed: boolean;
  candidateProfileExists: boolean;
  vacancySelected: boolean;
  coverLetterExists: boolean;
  requiredFieldsValid: boolean;
  externalUrlAvailable: boolean;
}

export interface ReadinessResult {
  checklist: ReadinessChecklist;
  /** True only when every BLOCKING item passes (external URL is non-blocking). */
  ready: boolean;
  missingItems: string[];
  warnings: string[];
}

/** Output of the Application Preparation AI Agent (or its deterministic fallback). */
export interface ApplicationPackage {
  readinessStatus: ReadinessStatus;
  confidenceScore: number; // 0..100
  missingItems: string[];
  validationWarnings: string[];
  recommendedAdjustments: string[];
  packageChecklist: { label: string; done: boolean }[];
  applicationSummary: string;
  source: "ai" | "deterministic";
}

/** Internal, safe application payload — references only, no raw text/secrets. */
export interface ApplicationPayload {
  applicationRunKey: string;
  isDryRun: true;
  job: {
    externalId?: string;
    title: string;
    company?: string;
    provider?: string;
    externalUrl?: string;
  };
  documents: { resumeRef: string; coverLetterRef: string };
  candidate: { profession?: string; resumeLanguage?: string };
  scores: { ats: number; match: number };
  createdAt: string;
}

export interface DryRunStageEvent {
  stage: ApplicationStage;
  status: "running" | "completed";
  atMs: number;
  durationMs?: number;
}

export interface DryRunResult {
  ok: boolean;
  isDryRun: true;
  /** ALWAYS false — the engine can never submit. */
  submitted: false;
  stages: DryRunStageEvent[];
  payload: ApplicationPayload | null;
  validation: { valid: boolean; warnings: string[]; missing: string[] };
  startedAtIso: string;
  completedAtIso: string;
  durationMs: number;
}
