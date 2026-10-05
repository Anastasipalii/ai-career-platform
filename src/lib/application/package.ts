// ============================================================================
// application/package — build the employer package + the separate dry-run report
// ----------------------------------------------------------------------------
// Pure (no Supabase / network / DOM). Two clearly separated outputs:
//
//   1) EMPLOYER PACKAGE — only what you'd actually send to apply:
//        Application_Package_<Company>_<Date>/
//          <original résumé PDF>        (real uploaded file when available)
//          Cover_Letter_<Company>.pdf   (clean PDF, NO disclaimer inside)
//      No ATS / match / summary / report is mixed in here.
//
//   2) DRY-RUN REPORT — a SEPARATE technical PDF (validation, ATS, match,
//      timeline, safety confirmation, timestamp). Never bundled with (1).
//
// Deterministic only — never regenerates AI content. Dry-run safety guarantees
// live in the report and in the run itself, not inside the cover letter.
// ============================================================================

import { createTextPdf } from "@/lib/application/pdf";
import { prepareApplicationPackage } from "@/lib/application/prepare";
import type { ApplicationRunRow } from "@/lib/application/applicationRun";
import type { ApplicationDraft } from "@/lib/application/types";

export interface PackageBinaryFile {
  name: string;
  data: Uint8Array;
}

/** The original uploaded résumé (real bytes), if we have it. */
export interface ResumeSource {
  fileName: string;
  data: Uint8Array;
  isPdf: boolean;
}

/** Client-side data used to fill package/report content (no AI). */
export interface PackageEnrichment {
  coverLetterText?: string;
  atsScore?: number;
  resumeName?: string;
  resumePreview?: string;
  profession?: string;
  resumeLanguage?: string;
  jobMatch?: { title?: string; company?: string; location?: string | null; matchScore?: number; whyMatch?: string };
}

const safeToken = (s?: string | null): string =>
  (s ?? "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "Company";
const dateStr = (now: () => number): string => new Date(now()).toISOString().slice(0, 10);

function resumeEntryName(fileName: string, forceExt?: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName).replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "Resume";
  const ext = (forceExt ?? (dot > 0 ? fileName.slice(dot + 1) : "pdf")).toLowerCase();
  return `${base}.${ext}`;
}

export function employerFolderName(company?: string | null, now: () => number = () => Date.now()): string {
  return `Application_Package_${safeToken(company)}_${dateStr(now)}`;
}
export function employerZipName(company?: string | null, now: () => number = () => Date.now()): string {
  return `${employerFolderName(company, now)}.zip`;
}

export interface EmployerPackageInput {
  company?: string | null;
  jobTitle?: string | null;
  /** Prefer the real uploaded file. */
  resume?: ResumeSource | null;
  /** Used ONLY to generate a résumé PDF when no original file exists. */
  resumeFallbackText?: string;
  coverLetterText?: string;
  now?: () => number;
}

/**
 * Build the employer-facing package: the original résumé (real file when
 * available; a generated PDF only as a fallback) + a clean cover-letter PDF.
 * No résumé.txt is produced when the original PDF exists. No disclaimer is
 * appended inside the cover letter.
 */
export function buildEmployerPackage(input: EmployerPackageInput): {
  folder: string;
  zipName: string;
  entries: PackageBinaryFile[];
} {
  const now = input.now ?? (() => Date.now());
  const folder = employerFolderName(input.company, now);
  const company = safeToken(input.company);
  const entries: PackageBinaryFile[] = [];

  // Résumé — prefer the real uploaded file.
  if (input.resume && input.resume.isPdf) {
    entries.push({ name: `${folder}/${resumeEntryName(input.resume.fileName, "pdf")}`, data: input.resume.data });
  } else if (input.resume) {
    // Original non-PDF (e.g. .docx) — include the real file with its real ext.
    entries.push({ name: `${folder}/${resumeEntryName(input.resume.fileName)}`, data: input.resume.data });
  } else {
    const text = (input.resumeFallbackText ?? "").trim() || "The original résumé file was not available for this run.";
    entries.push({ name: `${folder}/Resume.pdf`, data: createTextPdf({ title: "Résumé", body: text }) });
  }

  // Cover letter — clean professional PDF, NO dry-run disclaimer inside.
  const cover = (input.coverLetterText ?? "").trim() || "No cover letter was generated for this run.";
  entries.push({ name: `${folder}/Cover_Letter_${company}.pdf`, data: createTextPdf({ title: "Cover Letter", body: cover }) });

  return { folder, zipName: employerZipName(input.company, now), entries };
}

// ── Dry-run report (SEPARATE technical file) ──────────────────────────────────

export interface DryRunReportInput {
  row: ApplicationRunRow;
  ats?: number;
  matchScore?: number;
  profession?: string;
  resumeLanguage?: string;
  stages?: { stage: string; status: string; durationMs?: number }[];
  now?: () => number;
}

const clean = (s?: string | null): string => (s ?? "").toString();

export function buildDryRunReportText(input: DryRunReportInput): string {
  const now = input.now ?? (() => Date.now());
  const { row } = input;
  const ats = input.ats != null ? Math.round(input.ats) : null;
  const match = input.matchScore != null ? Math.round(input.matchScore) : null;
  const validation = row.validation_result ? JSON.stringify(row.validation_result) : "{}";

  const timeline =
    input.stages && input.stages.length
      ? input.stages.map((s) => `  - ${s.stage}: ${s.status}${s.durationMs != null ? ` (${s.durationMs}ms)` : ""}`)
      : [`  - reached stage: ${clean(row.current_step) || "—"} (status: ${clean(row.status) || "—"})`];

  return [
    line("Job", clean(row.job_title)),
    line("Company", clean(row.company)),
    line("Provider", clean(row.provider)),
    line("Candidate profession", clean(input.profession)),
    line("Résumé language", clean(input.resumeLanguage)),
    "",
    line("ATS score", ats != null ? `${ats} / 100` : "—"),
    line("Match score", match != null ? `${match}%` : "—"),
    line("Validation result", validation),
    "",
    "Timeline:",
    ...timeline,
    "",
    line("Status", clean(row.status)),
    line("Duration (ms)", row.duration_ms != null ? String(row.duration_ms) : "—"),
    line("is_dry_run", "true"),
    line("Generated", new Date(now()).toISOString()),
    "",
    "Safety confirmation:",
    "  No real application was sent. No employer API, email, browser automation,",
    "  webhook, or external POST was used. This run is a dry run only.",
  ].join("\n");
}

function line(label: string, value: string): string {
  return `${label}: ${value || "—"}`;
}

export function buildDryRunReportPdf(input: DryRunReportInput): Uint8Array {
  return createTextPdf({ title: "Dry Run Report", body: buildDryRunReportText(input) });
}

export function dryRunReportFileName(row: ApplicationRunRow, now: () => number = () => Date.now()): string {
  return `Dry_Run_Report_${safeToken(row.company)}_${dateStr(now)}.pdf`;
}

// ── Preview draft reconstruction (unchanged behaviour) ────────────────────────

export function draftFromRow(row: ApplicationRunRow, enrich: PackageEnrichment = {}): ApplicationDraft {
  return {
    createdAt: row.created_at ?? new Date().toISOString(),
    workflowRunId: row.workflow_run_id ?? undefined,
    job: {
      externalId: row.job_id ?? undefined,
      title: row.job_title ?? enrich.jobMatch?.title ?? "Application",
      company: row.company ?? enrich.jobMatch?.company ?? undefined,
      location: enrich.jobMatch?.location ?? null,
      provider: row.provider ?? undefined,
      sourceUrl: row.external_url ?? undefined,
      matchScore: enrich.jobMatch?.matchScore ?? 0,
    },
    atsScore: enrich.atsScore ?? 0,
    profession: enrich.profession,
    resumeLanguage: enrich.resumeLanguage,
    resumeName: enrich.resumeName,
    resumeAnalyzed: Boolean(enrich.profession || enrich.resumePreview),
    candidateProfilePresent: Boolean(enrich.profession),
    coverLetterPresent: Boolean(enrich.coverLetterText?.trim()),
    coverLetterPreview: enrich.coverLetterText,
  };
}

/** Deterministic readiness summary (no AI) — used by the report/preview, never
 *  bundled into the employer package. */
export function readinessSummary(draft: ApplicationDraft) {
  return prepareApplicationPackage(draft);
}
