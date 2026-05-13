"use client";

import { useState } from "react";
import { ResumeFormData } from "@/app/components/resume-builder/types";
import { SaveStatus, PdfStatus } from "@/app/components/resume-builder/ResumeBuilderClient";

interface ExportSectionProps {
  formData: ResumeFormData;
  onSave: () => void;
  onDownload: () => void;
  onToast: (message: string, type: "success" | "error") => void;
  saveStatus: SaveStatus;
  pdfStatus: PdfStatus;
  isSaved: boolean;
}

// ── Build clean plain-text resume ────────────────────────────────────────────
function buildResumeText(f: ResumeFormData): string {
  const lines: string[] = [];

  // Header
  if (f.fullName)  lines.push(f.fullName.toUpperCase());
  if (f.jobTitle)  lines.push(f.jobTitle);

  const contact = [f.email, f.phone, f.location, f.website, f.linkedin]
    .filter(Boolean)
    .join(" | ");
  if (contact) lines.push(contact);

  // Summary
  if (f.summary.trim()) {
    lines.push("", "SUMMARY");
    lines.push(f.summary.trim());
  }

  // Skills
  if (f.skills.length > 0) {
    lines.push("", "SKILLS");
    lines.push(f.skills.join(", "));
  }

  // Work Experience
  if (f.experience.length > 0) {
    lines.push("", "WORK EXPERIENCE");
    f.experience.forEach((exp) => {
      lines.push("");
      const header = [exp.company, exp.role].filter(Boolean).join(" — ");
      if (header) lines.push(header);
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      if (dates)  lines.push(dates);
      if (exp.description.trim()) {
        exp.description
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .forEach((l) => lines.push(`- ${l}`));
      }
    });
  }

  // Education
  if (f.education.length > 0) {
    lines.push("", "EDUCATION");
    f.education.forEach((edu) => {
      lines.push("");
      if (edu.institution) lines.push(edu.institution);
      const degree = [edu.degree, edu.field].filter(Boolean).join(", ");
      const dates  = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      const row    = [degree, dates].filter(Boolean).join(" | ");
      if (row) lines.push(row);
    });
  }

  // Languages
  if (f.languages.length > 0) {
    lines.push("", "LANGUAGES");
    f.languages.forEach((l) => {
      const entry = [l.language, l.proficiency].filter(Boolean).join(" — ");
      if (entry) lines.push(entry);
    });
  }

  return lines.join("\n");
}

// ── Clipboard with execCommand fallback ──────────────────────────────────────
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for environments without Clipboard API
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
  document.body.appendChild(el);
  el.focus();
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) throw new Error("execCommand copy failed");
}

// ── Save button content ───────────────────────────────────────────────────────
function SaveButtonContent({ saveStatus, isSaved }: { saveStatus: SaveStatus; isSaved: boolean }) {
  if (saveStatus === "saving") {
    return (
      <>
        <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" />
          <path d="M7.5 1.5a6 6 0 016 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        Saving…
      </>
    );
  }
  if (saveStatus === "saved") {
    return (
      <>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Saved!
      </>
    );
  }
  if (saveStatus === "error") {
    return (
      <>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.5 4.5v3.5M7.5 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Failed — try again
      </>
    );
  }
  return (
    <>
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 2h8.5L13 4.5V13H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
      {isSaved ? "Update Resume" : "Save Resume"}
    </>
  );
}

function saveButtonStyle(saveStatus: SaveStatus): React.CSSProperties {
  if (saveStatus === "saved") {
    return { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" };
  }
  if (saveStatus === "error") {
    return { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" };
  }
  return { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" };
}

// ── Component ─────────────────────────────────────────────────────────────────
type CopyStatus = "idle" | "copied" | "error";

export default function ExportSection({
  formData,
  onSave,
  onDownload,
  onToast,
  saveStatus,
  pdfStatus,
  isSaved,
}: ExportSectionProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const handleCopy = async () => {
    const text = buildResumeText(formData);
    try {
      await copyToClipboard(text);
      setCopyStatus("copied");
      onToast("Resume text copied", "success");
    } catch {
      setCopyStatus("error");
      onToast("Could not copy resume text", "error");
    } finally {
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  };

  const copyButtonStyle = (): React.CSSProperties => {
    if (copyStatus === "copied") {
      return { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" };
    }
    if (copyStatus === "error") {
      return { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" };
    }
    return { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" };
  };

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Export</p>

      <div className="flex flex-col gap-2.5">
        {/* Download PDF */}
        <button
          type="button"
          onClick={onDownload}
          disabled={pdfStatus === "generating"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: pdfStatus === "generating" ? "none" : "0 0 24px rgba(124,58,237,0.3)",
          }}
        >
          {pdfStatus === "generating" ? (
            <>
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.75" />
                <path d="M7.5 1.5a6 6 0 016 6" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF
            </>
          )}
        </button>

        {/* Save / Update */}
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          style={saveButtonStyle(saveStatus)}
        >
          <SaveButtonContent saveStatus={saveStatus} isSaved={isSaved} />
        </button>

        {/* Copy Text */}
        <button
          type="button"
          onClick={handleCopy}
          disabled={copyStatus !== "idle"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:cursor-default"
          style={copyButtonStyle()}
        >
          {copyStatus === "copied" ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7l3.5 3.5 6.5-6.5" />
              </svg>
              Copied!
            </>
          ) : copyStatus === "error" ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5.5" />
                <path d="M7 4.5v3M7 9.5v.5" />
              </svg>
              Copy failed
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="8" height="9" rx="1" />
                <path d="M10 4V2.5a.5.5 0 00-.5-.5h-7a.5.5 0 00-.5.5v8a.5.5 0 00.5.5H4" />
              </svg>
              Copy Text
            </>
          )}
        </button>
      </div>
    </div>
  );
}
