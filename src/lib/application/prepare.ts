// ============================================================================
// application/prepare — readiness checks + deterministic preparation agent
// ----------------------------------------------------------------------------
// Pure (no Supabase / network / OpenAI imports). This is BOTH the fallback for
// the AI agent and the authoritative source of readiness/validation, so the
// application always works even when the AI route is unavailable. It only reads
// the provided draft; it never sends anything anywhere.
// ============================================================================

import type {
  ApplicationDraft,
  ApplicationPackage,
  ReadinessChecklist,
  ReadinessResult,
  ReadinessStatus,
} from "@/lib/application/types";

/** Human labels for the checklist items (also used for missing-item messages). */
const LABELS: Record<keyof ReadinessChecklist, string> = {
  resumeExists: "Resume provided",
  resumeAnalyzed: "Resume analyzed",
  candidateProfileExists: "Candidate profile generated",
  vacancySelected: "Vacancy selected",
  coverLetterExists: "Cover letter generated",
  requiredFieldsValid: "Required fields valid",
  externalUrlAvailable: "External job URL available",
};

// Items that BLOCK the dry run when missing. The external URL is intentionally
// non-blocking: a dry run never submits, so a missing listing URL is only a
// warning, not a blocker.
const BLOCKING: (keyof ReadinessChecklist)[] = [
  "resumeExists",
  "resumeAnalyzed",
  "candidateProfileExists",
  "vacancySelected",
  "coverLetterExists",
  "requiredFieldsValid",
];

/** Build the readiness checklist from a draft. Pure. */
export function buildReadinessChecklist(draft: ApplicationDraft | null): ReadinessChecklist {
  const job = draft?.job;
  const hasTitle = Boolean(job && job.title && job.title.trim().length > 0);
  const requiredFieldsValid = hasTitle;
  return {
    resumeExists: Boolean(draft?.resumeName && draft.resumeName.trim().length > 0),
    resumeAnalyzed: Boolean(draft?.resumeAnalyzed),
    candidateProfileExists: Boolean(draft?.candidateProfilePresent && draft?.profession),
    vacancySelected: hasTitle,
    coverLetterExists: Boolean(draft?.coverLetterPresent),
    requiredFieldsValid,
    externalUrlAvailable: Boolean(job?.sourceUrl && /^https?:\/\//i.test(job.sourceUrl)),
  };
}

/** Evaluate readiness — `ready` is true only when every blocking item passes. */
export function evaluateReadiness(draft: ApplicationDraft | null): ReadinessResult {
  const checklist = buildReadinessChecklist(draft);
  const missingItems = BLOCKING.filter((k) => !checklist[k]).map((k) => LABELS[k]);
  const warnings: string[] = [];
  if (!checklist.externalUrlAvailable) warnings.push("No external listing URL — the dry run will skip the link reference.");
  return { checklist, ready: missingItems.length === 0, missingItems, warnings };
}

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n || 0)));

/**
 * Deterministic Application Preparation Agent. Produces the full package from
 * the draft alone — no network, no AI. Used directly as a fallback and as the
 * base the optional AI enrichment merges over.
 */
export function prepareApplicationPackage(draft: ApplicationDraft | null): ApplicationPackage {
  const { checklist, ready, missingItems, warnings } = evaluateReadiness(draft);

  const ats = clamp(draft?.atsScore ?? 0);
  const match = clamp(draft?.job?.matchScore ?? 0);

  // Confidence: readiness is the gate; ATS + match nudge it within the ready band.
  const base = ready ? 60 : 25;
  const confidenceScore = clamp(base + Math.round((ats * 0.2 + match * 0.2)));

  const readinessStatus: ReadinessStatus = ready
    ? confidenceScore >= 70
      ? "ready"
      : "needs_attention"
    : "not_ready";

  const validationWarnings = [...warnings];
  if (ready && ats < 60) validationWarnings.push("ATS score is below 60 — consider tightening keywords before applying for real.");
  if (ready && match < 50) validationWarnings.push("Match score is modest — this role may be a stretch fit.");

  const recommendedAdjustments: string[] = [];
  if (ats < 75) recommendedAdjustments.push("Mirror more of the job's required skills in the resume summary.");
  if (match < 70) recommendedAdjustments.push("Emphasize the strengths that overlap most with this vacancy.");
  if (!checklist.externalUrlAvailable) recommendedAdjustments.push("Add the listing URL so you can apply on the provider site.");
  if (recommendedAdjustments.length === 0) recommendedAdjustments.push("Package looks solid — review the cover letter tone once more before applying for real.");

  const packageChecklist = (Object.keys(checklist) as (keyof ReadinessChecklist)[]).map((k) => ({
    label: LABELS[k],
    done: checklist[k],
  }));

  const job = draft?.job;
  const applicationSummary = ready
    ? `Dry-run package ready for ${job?.title ?? "the selected role"}${job?.company ? ` at ${job.company}` : ""}: résumé (${draft?.resumeName ?? "provided"}) + cover letter prepared in ${draft?.resumeLanguage ?? "the resume language"}, ATS ${ats}, match ${match}. No application will be sent.`
    : `Package not ready: ${missingItems.join(", ")}. Complete these before running the dry run.`;

  return {
    readinessStatus,
    confidenceScore,
    missingItems,
    validationWarnings,
    recommendedAdjustments,
    packageChecklist,
    applicationSummary,
    source: "deterministic",
  };
}
