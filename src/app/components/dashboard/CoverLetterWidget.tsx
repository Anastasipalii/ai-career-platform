"use client";

// ============================================================================
// CoverLetterWidget — shows the latest generated cover letter on the Dashboard
// ----------------------------------------------------------------------------
// Reads from the same `workflow` result the Dashboard already loads (Supabase
// row preferred, else localStorage), so it persists across refresh. Provides a
// collapsed preview with "View full letter", Copy, and Download PDF. If the run
// had no real cover letter text, it falls back to a demo letter, clearly marked.
// Additive card — the existing Dashboard layout is unchanged.
// ============================================================================

import { useState } from "react";
import type { WorkflowResults } from "@/lib/workflowResults";

// Shown only when a run produced no cover letter text at all (edge case / old
// records). New runs always persist their text, including demo-fallback runs.
const DEMO_COVER_TEXT =
  "Dear Hiring Manager,\n\n" +
  "I'm excited to apply for this role. Across my career I've focused on delivering " +
  "measurable results, collaborating closely with cross-functional partners, and raising " +
  "the quality bar of the products I work on.\n\n" +
  "I take ownership of initiatives end to end — scoping the problem, shipping iteratively, " +
  "and using data to confirm the impact.\n\n" +
  "I'd welcome the chance to bring that same focus and reliability to your team.\n\n" +
  "Sincerely,";

function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard unavailable"));
}

function downloadPdf(text: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=1100");
  if (!win) return;
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

interface CoverLetterWidgetProps {
  workflow: WorkflowResults | null;
}

export default function CoverLetterWidget({ workflow }: CoverLetterWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Only render once a run has generated a cover letter.
  if (!workflow || !workflow.coverLetterGenerated) return null;

  const hasRealText = Boolean(workflow.coverLetterText && workflow.coverLetterText.trim());
  const text = hasRealText ? (workflow.coverLetterText as string) : DEMO_COVER_TEXT;
  const isDemo = workflow.source === "demo-fallback" || !hasRealText;

  const roleCompany = [workflow.coverLetterRole, workflow.coverLetterCompany]
    .filter(Boolean)
    .join(" · ");
  const title = workflow.coverLetterTitle || "Generated Cover Letter";
  const filename = `cover-letter-${(workflow.coverLetterCompany || "letter")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  const handleCopy = () => {
    copyText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* clipboard unavailable — ignore */
      });
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Latest Cover Letter</h2>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={
                isDemo
                  ? { color: "#fbbf24", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }
                  : { color: "#34d399", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isDemo ? "#fbbf24" : "#34d399" }} />
              {isDemo ? "Demo AI fallback" : "Live AI"}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-1 truncate">{title}</p>
          {roleCompany && <p className="text-[11px] text-slate-600 mt-0.5 truncate">{roleCompany}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
            onClick={() => downloadPdf(text, filename)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:text-white"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div
          className="relative rounded-xl px-4 py-4 text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-line overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            maxHeight: expanded ? "none" : 200,
          }}
        >
          {text}
          {!expanded && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
              style={{ background: "linear-gradient(to top, rgba(13,13,22,0.95), transparent)" }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors"
          style={{ color: "#a78bfa" }}
        >
          {expanded ? "Show less" : "View full letter"}
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <path d="M3 4.5L6 7.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
