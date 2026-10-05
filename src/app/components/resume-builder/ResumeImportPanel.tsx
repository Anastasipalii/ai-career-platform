"use client";

// ============================================================================
// ResumeImportPanel — import an existing résumé into the Resume Builder (Step 3)
// ----------------------------------------------------------------------------
// Flow: upload PDF/DOCX/TXT → parse text CLIENT-SIDE (shared parser) → POST the
// extracted TEXT to /api/resume/parse → REVIEW the structured draft → the user
// explicitly applies it (Apply / Replace / Merge / Cancel). Nothing is applied
// or saved automatically. The original file is never uploaded — only text.
// ============================================================================

import { useEffect, useId, useRef, useState } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import {
  parseResumeFile,
  classifyResumeFile,
  ResumeParseError,
} from "@/lib/resume/parseResumeFile";
import type { ResumeParseDraft } from "@/lib/resume/parseResumeDraft";
import {
  draftToFormData,
  mergeResumeDraft,
} from "@/lib/resume/importResume";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

type ImportState = "idle" | "extracting" | "structuring" | "review" | "applied";

interface ResumeImportPanelProps {
  existingData: ResumeFormData;
  /** True when the builder already holds real user data (not the sample). */
  hasExistingData: boolean;
  onApply: (next: ResumeFormData, mode: "import" | "merge" | "replace") => void;
  onClose: () => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB client-side guard

const STATE_LABEL: Record<ImportState, string> = {
  idle: "Choose a résumé file to import.",
  extracting: "Reading text from your file…",
  structuring: "Organizing your résumé with AI…",
  review: "Review what we found, then choose how to apply it.",
  applied: "Imported résumé applied to the builder.",
};

// Map a typed parser error to friendly copy.
function parserErrorMessage(err: unknown): string {
  if (err instanceof ResumeParseError) {
    switch (err.code) {
      case "unsupported_type":
        return err.message;
      case "empty_file":
        return "This file is empty. Please choose a file with content.";
      case "pdf_no_text":
        return "This looks like a scanned or image-only PDF. v1 can't read those — export a text-based PDF, or paste your résumé text instead.";
      case "docx_failed":
        return "We couldn't read this .docx file. Try re-saving it, or upload a PDF or TXT.";
      case "read_failed":
      case "parse_failed":
      default:
        return "We couldn't read this file. Please try another file.";
    }
  }
  return "We couldn't read this file. Please try another file.";
}

// Map an /api/resume/parse HTTP failure to friendly copy.
function apiErrorMessage(status: number, code?: string): string {
  if (status === 400) return "We couldn't find readable résumé text in that file. Try another file or paste your text.";
  if (status === 413) return "This résumé is too large to process. Please shorten it and try again.";
  if (status === 429) return "The AI service is busy right now. Please wait a moment and try again.";
  if (status === 502) return "The parser returned an unexpected result. Please try again.";
  if (status === 503) return "Résumé import is temporarily unavailable. Please try again later, or enter your details manually.";
  return code ? `Import failed (${code}). Please try again.` : "Import failed. Please try again.";
}

function Field({ label, value }: { label: string; value: string }) {
  const empty = !value.trim();
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={empty ? "text-[12.5px] text-slate-600 italic" : "text-[13px] text-slate-200"}>
        {empty ? "Not found" : value}
      </div>
    </div>
  );
}

export default function ResumeImportPanel({
  existingData,
  hasExistingData,
  onApply,
  onClose,
}: ResumeImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResumeParseDraft | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const busy = state === "extracting" || state === "structuring";

  // Move focus to the review region when it appears (keyboard/screen-reader UX).
  useEffect(() => {
    if (state === "review") reviewRef.current?.focus();
  }, [state]);

  const reset = () => {
    setState("idle");
    setError(null);
    setDraft(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (busy) return; // repeated-click / concurrent-upload protection
    setError(null);
    setDraft(null);
    if (!file) return;

    // Client-side type + size validation BEFORE any work.
    const kind = classifyResumeFile(file);
    if (kind === "unsupported" || kind === "legacy_doc") {
      setError(
        kind === "legacy_doc"
          ? "Legacy .doc isn't supported. Save it as .docx or PDF, or paste your text."
          : "Unsupported file. Please upload a PDF, DOCX, or TXT résumé."
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than 8 MB. Please upload a smaller résumé file.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setFileName(file.name);

    // 1) Extract text in the browser (file bytes never leave the device).
    let text: string;
    setState("extracting");
    try {
      const parsed = await parseResumeFile(file);
      text = parsed.text;
    } catch (err) {
      setError(parserErrorMessage(err));
      setState("idle");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // 2) Send ONLY the extracted text to the structuring API.
    setState("structuring");
    try {
      const res = await authedFetch("/api/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      if (!res.ok) {
        let code: string | undefined;
        try {
          const j = (await res.json()) as { error?: { code?: string } };
          code = j.error?.code;
        } catch {
          /* ignore parse of error body */
        }
        setError(apiErrorMessage(res.status, code));
        setState("idle");
        return;
      }
      const data = (await res.json()) as { draft?: ResumeParseDraft };
      if (!data.draft) {
        setError("The parser returned an empty result. Please try again.");
        setState("idle");
        return;
      }
      setDraft(data.draft);
      setState("review");
    } catch {
      setError("Network error while importing. Check your connection and try again.");
      setState("idle");
    }
  };

  const apply = (mode: "replace" | "merge") => {
    if (!draft) return;
    onApply(mergeResumeDraft(existingData, draft, mode), mode);
    setState("applied");
  };

  const applyFresh = () => {
    if (!draft) return;
    onApply(draftToFormData(draft), "import");
    setState("applied");
  };

  return (
    <section
      aria-label="Import an existing résumé"
      className="rounded-2xl border p-5 mb-6"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.09)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.28)" }}
          >
            <FileText size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-[13.5px] leading-tight">Import an existing résumé</h3>
            <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
              Upload a PDF, DOCX, or TXT. Scanned/image-only PDFs aren&apos;t supported in v1.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[12px] font-medium text-slate-400 border transition-colors hover:text-white"
          style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          aria-label="Close import"
        >
          <X size={13} />
        </button>
      </div>

      {/* Privacy note — truthful about what leaves the device */}
      <p className="text-[11px] text-slate-500 mb-3 leading-snug">
        Your file is read in your browser; only the extracted text is sent to our AI service to organize it.
        The original file is not uploaded.
      </p>

      {/* Upload control (hidden input + labelled button) */}
      {state !== "review" && state !== "applied" && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {busy ? "Working…" : "Choose file"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            className="hidden"
            disabled={busy}
            aria-describedby={statusId}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {fileName && <span className="ml-3 text-[11.5px] text-slate-500">{fileName}</span>}
        </div>
      )}

      {/* Accessible live status + errors (text + icon, never color-only) */}
      <div id={statusId} aria-live="polite" className="mt-3">
        {error ? (
          <div
            className="flex items-start gap-2 rounded-xl px-3.5 py-2.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.24)" }}
            role="alert"
          >
            <AlertTriangle size={14} className="text-red-300 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-200/90 leading-snug">{error}</p>
          </div>
        ) : busy ? (
          <div className="flex items-center gap-2 text-[12px] text-cyan-200/90">
            <Loader2 size={13} className="animate-spin" />
            <span>{STATE_LABEL[state]}</span>
          </div>
        ) : state === "applied" ? (
          <div className="flex items-center gap-2 text-[12px] text-emerald-300">
            <CheckCircle2 size={14} />
            <span>{STATE_LABEL.applied}</span>
          </div>
        ) : null}
      </div>

      {/* Review step */}
      {state === "review" && draft && (
        <div
          ref={reviewRef}
          tabIndex={-1}
          role="group"
          aria-label="Imported résumé review"
          className="mt-4 rounded-xl border p-4 outline-none"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.09)" }}
        >
          <p className="text-[12px] text-slate-300 mb-3">{STATE_LABEL.review}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Field label="Full name" value={draft.fullName} />
            <Field label="Job title" value={draft.jobTitle} />
            <Field label="Email" value={draft.email} />
            <Field label="Phone" value={draft.phone} />
            <Field label="Location" value={draft.location} />
            <Field label="Website" value={draft.website} />
            <Field label="LinkedIn" value={draft.linkedin} />
          </div>

          <Field label="Professional summary" value={draft.summary} />

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Skills ({draft.skills.length})</div>
            {draft.skills.length ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {draft.skills.map((s, i) => (
                  <span key={i} className="text-[11.5px] text-slate-200 px-2 py-0.5 rounded"
                    style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>{s}</span>
                ))}
              </div>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Work experience ({draft.experience.length})</div>
            {draft.experience.length ? (
              <ul className="mt-1 space-y-1.5">
                {draft.experience.map((e) => (
                  <li key={e.id} className="text-[12.5px] text-slate-200">
                    <span className="font-medium">{[e.role, e.company].filter(Boolean).join(" — ") || "Untitled role"}</span>
                    {(e.startDate || e.endDate) && (
                      <span className="text-slate-500"> · {[e.startDate, e.endDate].filter(Boolean).join(" – ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Education ({draft.education.length})</div>
            {draft.education.length ? (
              <ul className="mt-1 space-y-1.5">
                {draft.education.map((e) => (
                  <li key={e.id} className="text-[12.5px] text-slate-200">
                    <span className="font-medium">{[e.degree, e.field].filter(Boolean).join(", ") || e.institution || "Education"}</span>
                    {e.institution && <span className="text-slate-500"> · {e.institution}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Languages ({draft.languages.length})</div>
            {draft.languages.length ? (
              <ul className="mt-1 space-y-1">
                {draft.languages.map((l) => (
                  <li key={l.id} className="text-[12.5px] text-slate-200">
                    {l.language}
                    {l.proficiency ? (
                      <span className="text-slate-500"> · {l.proficiency}</span>
                    ) : (
                      <span className="text-amber-400/90"> · level not specified (set it in the form)</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Projects ({draft.projects.length})</div>
            {draft.projects.length ? (
              <ul className="mt-1 space-y-1.5">
                {draft.projects.map((p) => (
                  <li key={p.id} className="text-[12.5px] text-slate-200">
                    <span className="font-medium">{[p.name, p.role].filter(Boolean).join(" — ") || "Untitled project"}</span>
                    {(p.startDate || p.endDate || p.current) && (
                      <span className="text-slate-500"> · {[p.startDate, p.current ? "Present" : p.endDate].filter(Boolean).join(" – ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Certifications ({draft.certifications.length})</div>
            {draft.certifications.length ? (
              <ul className="mt-1 space-y-1.5">
                {draft.certifications.map((c) => (
                  <li key={c.id} className="text-[12.5px] text-slate-200">
                    <span className="font-medium">{[c.name, c.issuer].filter(Boolean).join(" — ") || "Certification"}</span>
                    {(c.issueDate || c.expirationDate) && (
                      <span className="text-slate-500"> · {[c.issueDate, c.expirationDate].filter(Boolean).join(" – ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Professional links ({draft.professionalLinks.length})</div>
            {draft.professionalLinks.length ? (
              <ul className="mt-1 space-y-1">
                {draft.professionalLinks.map((l) => (
                  <li key={l.id} className="text-[12.5px] text-slate-200 break-all">
                    <span className="font-medium">{l.label || "Link"}</span>
                    <span className="text-slate-500"> · {l.url}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Custom sections ({draft.customSections.length})</div>
            {draft.customSections.length ? (
              <ul className="mt-1 space-y-1.5">
                {draft.customSections.map((sec) => (
                  <li key={sec.id} className="text-[12.5px] text-slate-200">
                    <span className="font-medium">{sec.title || "Section"}</span>
                    <span className="text-slate-500"> · {sec.items.length} {sec.items.length === 1 ? "entry" : "entries"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">Not found</div>
            )}
          </div>

          {/* Unmapped text — never silently discarded */}
          <div style={{ marginBottom: 4 }}>
            <label htmlFor={`${statusId}-unmapped`} className="text-[11px] uppercase tracking-wide text-slate-500">
              Other content we couldn&apos;t map (copy anything useful manually)
            </label>
            {draft.unmappedText.trim() ? (
              <textarea
                id={`${statusId}-unmapped`}
                readOnly
                value={draft.unmappedText}
                rows={4}
                className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] text-slate-300 outline-none resize-y"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}
              />
            ) : (
              <div className="text-[12.5px] text-slate-600 italic">None</div>
            )}
          </div>

          {/* Apply controls */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {hasExistingData ? (
              <>
                <span className="text-[11.5px] text-amber-300/90 w-full mb-1">
                  Your builder already has content. Choose how to apply the import:
                </span>
                <button type="button" onClick={() => apply("merge")}
                  className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                  Merge with current résumé
                </button>
                <button type="button" onClick={() => apply("replace")}
                  className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-slate-200 border transition-colors hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}>
                  Replace current résumé
                </button>
                <button type="button" onClick={reset}
                  className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-slate-400 border transition-colors hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={applyFresh}
                  className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                  Apply imported résumé
                </button>
                <button type="button" onClick={reset}
                  className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-slate-400 border transition-colors hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* After applying: offer to import another or close */}
      {state === "applied" && (
        <div className="flex items-center gap-2 mt-3">
          <button type="button" onClick={reset}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-slate-200 border transition-colors hover:text-white"
            style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}>
            Import another
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-slate-400 border transition-colors hover:text-white"
            style={{ borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}>
            Done
          </button>
        </div>
      )}
    </section>
  );
}
