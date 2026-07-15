// ============================================================================
// application/download — shared client-side downloads (single source of truth)
// ----------------------------------------------------------------------------
// Both the Dashboard cards and the /apply/preview final screen call THESE, so
// package generation is never duplicated:
//   • downloadApplicationPackage — the employer ZIP (original résumé + cover
//     letter PDF) — nothing technical mixed in.
//   • downloadDryRunReport       — the SEPARATE technical report PDF.
// Enrichment (cover letter, ATS, match, résumé ref) comes from the existing
// workflow run in localStorage, and the original résumé bytes come from the
// résumé file store. No AI is regenerated and NO network request is made.
// DOM-based download, so call client-side only.
// ============================================================================

import { readWorkflowResults } from "@/lib/workflowResults";
import { createZip } from "@/lib/application/zip";
import {
  buildEmployerPackage,
  buildDryRunReportPdf,
  dryRunReportFileName,
  type PackageEnrichment,
  type ResumeSource,
} from "@/lib/application/package";
import { readResumeFile, isPdfFile } from "@/lib/application/resumeFileStore";
import type { ApplicationRunRow } from "@/lib/application/applicationRun";

/** Enrichment for a run, pulled from the existing workflow results in storage. */
export function enrichmentForRow(row: ApplicationRunRow): PackageEnrichment {
  const results = readWorkflowResults();
  if (!results) return {};
  const matches = results.jobMatches ?? [];
  const job =
    matches.find((m) => (row.job_id && m.externalId === row.job_id) || (row.job_title && m.title === row.job_title)) ??
    undefined;
  const sameRun = Boolean(results.runId && row.workflow_run_id && results.runId === row.workflow_run_id);
  const linked = sameRun || Boolean(job);
  return {
    coverLetterText: linked ? results.coverLetterText : undefined,
    atsScore: linked ? results.atsScore : undefined,
    resumeName: results.resumeName,
    resumePreview: results.resumePreview,
    profession: results.profession,
    resumeLanguage: results.resumeLanguage,
    jobMatch: job
      ? { title: job.title, company: job.company, location: job.location ?? null, matchScore: job.matchScore, whyMatch: job.whyMatch }
      : undefined,
  };
}

function triggerDownload(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read the stored original résumé, if any, as a package résumé source. */
function resumeSource(): ResumeSource | null {
  const stored = readResumeFile();
  if (!stored) return null;
  return { fileName: stored.name, data: stored.bytes, isPdf: isPdfFile(stored.name, stored.type) };
}

/** Download the employer ZIP: original résumé + cover-letter PDF. */
export function downloadApplicationPackage(row: ApplicationRunRow, enrich?: PackageEnrichment): void {
  const e = enrich ?? enrichmentForRow(row);
  const { entries, zipName } = buildEmployerPackage({
    company: row.company,
    jobTitle: row.job_title,
    resume: resumeSource(),
    resumeFallbackText: e.resumePreview,
    coverLetterText: e.coverLetterText,
  });
  const zip = createZip(entries.map((x) => ({ name: x.name, data: x.data })));
  triggerDownload(zip, zipName, "application/zip");
}

/** Download the SEPARATE technical dry-run report (never bundled with the pkg). */
export function downloadDryRunReport(
  row: ApplicationRunRow,
  opts?: { stages?: { stage: string; status: string; durationMs?: number }[] }
): void {
  const e = enrichmentForRow(row);
  const pdf = buildDryRunReportPdf({
    row,
    ats: e.atsScore,
    matchScore: e.jobMatch?.matchScore,
    profession: e.profession,
    resumeLanguage: e.resumeLanguage,
    stages: opts?.stages,
  });
  triggerDownload(pdf, dryRunReportFileName(row), "application/pdf");
}
