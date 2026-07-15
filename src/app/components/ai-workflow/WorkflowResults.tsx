"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_OUTPUTS, type WorkflowOutputs, type JobMatch } from "./mockOutputs";
import { readWorkflowResults } from "@/lib/workflowResults";
import { saveApplicationDraft } from "@/lib/application/applicationDraft";
import type { ApplicationDraft } from "@/lib/application/types";

// Copy plain text to the clipboard (same pattern the cover-letter page uses).
function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard unavailable"));
}

// Print-to-PDF via a new window (same pattern the cover-letter page uses).
function downloadCoverLetterPdf(text: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=1100");
  if (!win) return; // popups blocked — no-op, never throws
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>*{box-sizing:border-box;margin:0;padding:0}` +
      `body{font-family:Georgia,'Times New Roman',serif;color:#111;background:#fff;padding:56px 64px;line-height:1.6}` +
      `pre{white-space:pre-wrap;font-family:inherit;font-size:13.5px}` +
      `@page{margin:24mm;size:A4}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>` +
      `</head><body><pre>${safe}</pre></body></html>`
  );
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* user can still print manually */
    }
  }, 500);
}

interface WorkflowResultsProps {
  show: boolean;
  /** Real (or mapped) run outputs. Defaults to the demo mock. */
  results?: WorkflowOutputs;
  /** Provenance badge — omitted for the pure demo run. */
  source?: "live-ai" | "demo-fallback";
}

const cardStyle = {
  background: "rgba(13,13,22,0.6)",
  borderColor: "rgba(255,255,255,0.08)",
} as const;

// ── ATS circular gauge (static — always renders its final value) ──────────────
function AtsGauge({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="relative w-[116px] h-[116px] shrink-0">
      <svg width="116" height="116" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke="url(#atsGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="atsGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-2xl leading-none">{score}</span>
        <span className="text-slate-500 text-[10px] mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function WorkflowResults({ show, results, source }: WorkflowResultsProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Snapshot the selected REAL vacancy + run context into a client-only draft,
  // then open the (dry-run) Application Preview. Nothing is ever submitted.
  const prepareApplication = (m: JobMatch) => {
    const persisted = readWorkflowResults();
    const draft: ApplicationDraft = {
      createdAt: new Date().toISOString(),
      workflowRunId: persisted?.runId,
      job: {
        externalId: m.externalId,
        title: m.title,
        company: m.company,
        location: m.location ?? null,
        provider: m.provider,
        jobTypes: m.jobTypes,
        employmentType: m.jobTypes?.[0],
        sourceUrl: m.sourceUrl,
        matchScore: m.matchScore,
      },
      atsScore: (results ?? MOCK_OUTPUTS).ats.score,
      profession: persisted?.profession,
      resumeLanguage: persisted?.resumeLanguage,
      resumeName: persisted?.resumeName,
      resumeAnalyzed: Boolean(persisted?.detectedSkills?.length || persisted?.profession),
      candidateProfilePresent: Boolean(persisted?.profession),
      coverLetterPresent: Boolean(persisted?.coverLetterText?.trim()),
      coverLetterPreview: persisted?.coverLetterText?.slice(0, 600),
    };
    saveApplicationDraft(draft);
    router.push("/apply/preview");
  };

  if (!show) return null;
  const o = results ?? MOCK_OUTPUTS;

  const handleCopy = () => {
    copyText(o.coverLetter.preview)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* clipboard unavailable — silently ignore */
      });
  };

  const handleDownload = () =>
    downloadCoverLetterPdf(
      o.coverLetter.preview,
      `cover-letter-${o.coverLetter.company}`.toLowerCase().replace(/\s+/g, "-")
    );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9.2 7.4 12.5 14 5.5" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-lg tracking-tight leading-tight">Pipeline complete — your outputs</h3>
            {source === "live-ai" && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "#34d399", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
                Live AI
              </span>
            )}
          </div>
          <p className="text-slate-500 text-[12.5px]">Generated from your resume</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ATS score */}
        <div className="rounded-2xl border p-5" style={cardStyle}>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-4">ATS Score</h4>
          <div className="flex items-center gap-5">
            <AtsGauge score={o.ats.score} />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-[13px] font-medium mb-3">{o.ats.verdict}</p>
              <div className="flex flex-col gap-2.5">
                {o.ats.subScores.filter((s) => s.score > 0).map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-[11.5px]">{s.label}</span>
                      <span className="text-slate-300 text-[11.5px] font-medium tabular-nums">{s.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", width: `${s.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Missing skills */}
        <div className="rounded-2xl border p-5" style={cardStyle}>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Missing Skills</h4>
          <p className="text-slate-400 text-[12.5px] mb-3 leading-relaxed">
            Skills the target roles expect that aren&apos;t yet on your resume:
          </p>
          {o.missingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {o.missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.28)" }}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[12px]">
              Run the pipeline with your resume to see the skill gaps for your field.
            </p>
          )}
        </div>

        {/* Improved resume bullets — full width (only when produced) */}
        {o.resumeBullets.length > 0 && (
        <div className="rounded-2xl border p-5 lg:col-span-2" style={cardStyle}>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Improved Resume Bullets</h4>
          <div className="flex flex-col gap-3">
            {o.resumeBullets.map((b, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div
                  className="rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-500 line-through decoration-slate-600"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {b.before}
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mx-auto rotate-90 md:rotate-0 text-slate-600 shrink-0">
                  <path d="M3 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div
                  className="rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-200"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.22)" }}
                >
                  {b.after}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Top job matches — full width */}
        <div className="rounded-2xl border p-5 lg:col-span-2" style={cardStyle}>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Top Job Matches</h4>
          {o.jobMatches.length === 0 && (
            <p className="text-slate-500 text-[12px]">
              {o.jobsUnavailable
                ? "Live job data is temporarily unavailable."
                : "No relevant live vacancies were found for this profile right now."}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {o.jobMatches.slice(0, 6).map((m, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex flex-col gap-2.5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-[13px] leading-tight">{m.title}</p>
                    {m.company && <p className="text-slate-500 text-[11px] mt-0.5">{m.company}</p>}
                  </div>
                  <span
                    className="shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-md tabular-nums"
                    style={{ color: "#34d399", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)" }}
                  >
                    {m.matchScore}%
                  </span>
                </div>
                {(m.location || m.remote || (m.jobTypes && m.jobTypes.length) || m.publishedAt) && (
                  <p className="text-slate-500 text-[11px] leading-snug">
                    {[
                      m.location || null,
                      m.remote ? "Remote" : null,
                      m.jobTypes && m.jobTypes.length ? m.jobTypes.join(" / ") : null,
                      m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {/* Strengths / missing / learn-next are stored on the run but
                    intentionally hidden on the compact card (kept for a future
                    detailed vacancy page). */}
                {/* Prepare Application (dry run) + the REAL provider listing.
                    Neither ever submits an application. */}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                  {!m.synthetic && (
                    <button
                      type="button"
                      onClick={() => prepareApplication(m)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-md text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                    >
                      Prepare Application
                    </button>
                  )}
                  {m.sourceUrl && (
                    <a
                      href={m.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium hover:underline"
                      style={{ color: "#7dd3fc" }}
                    >
                      View &amp; apply ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cover letter preview */}
        <div className="rounded-2xl border p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Cover Letter Preview</h4>
            {(o.coverLetter.role || o.coverLetter.company) && (
              <span className="text-[11px] text-slate-500">
                {[o.coverLetter.role, o.coverLetter.company].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          <div
            className="rounded-xl px-4 py-4 text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-line max-h-[220px] overflow-y-auto wf-scroll"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {o.coverLetter.preview}
          </div>

          {/* Cover letter actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
                color: copied ? "#6ee7b7" : "rgba(255,255,255,0.75)",
              }}
            >
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M10 5V3.5A1.5 1.5 0 008.5 2h-5A1.5 1.5 0 002 3.5v5A1.5 1.5 0 003.5 10H5" stroke="currentColor" strokeWidth="1.25" />
                </svg>
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
            >
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Interview questions */}
        <div className="rounded-2xl border p-5" style={cardStyle}>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Interview Questions</h4>
          {o.interviewQuestions.length === 0 && (
            <p className="text-slate-500 text-[12px]">
              Run the pipeline with your resume to generate questions tailored to your field.
            </p>
          )}
          <ol className="flex flex-col gap-2.5">
            {o.interviewQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-semibold mt-0.5"
                  style={{ background: "rgba(236,72,153,0.14)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.28)" }}
                >
                  {i + 1}
                </span>
                <span className="text-slate-300 text-[12.5px] leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
