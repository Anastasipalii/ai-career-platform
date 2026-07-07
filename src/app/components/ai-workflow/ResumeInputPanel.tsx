"use client";

// ============================================================================
// ResumeInputPanel — optional resume input for the pipeline
// ----------------------------------------------------------------------------
// Lets the user paste resume text or upload a file. .txt / .md are read as
// plain text into the textarea; .pdf / .doc / .docx are accepted (name shown)
// but not parsed yet — the user is prompted to paste the text. Purely additive:
// when left empty the pipeline runs its existing mock demo unchanged. Styling
// reuses the app's dark-card design tokens; nothing else on the page is redesigned.
// ============================================================================

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

interface ResumeInputPanelProps {
  value: string;
  onChange: (text: string) => void;
  /** File name when a file was uploaded (for the run summary). */
  fileName: string | null;
  onFileNameChange: (name: string | null) => void;
  /** Optional job description to tailor the cover letter + matches. */
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  /** Disable inputs while a run is in flight. */
  disabled?: boolean;
}

const MAX_CHARS = 20000;

export default function ResumeInputPanel({
  value,
  onChange,
  fileName,
  onFileNameChange,
  jobDescription,
  onJobDescriptionChange,
  disabled,
}: ResumeInputPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    setNotice(null);
    if (!file) return;

    const isText =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      /\.(txt|md|markdown)$/i.test(file.name);
    const isDoc =
      /\.(pdf|doc|docx)$/i.test(file.name) ||
      file.type === "application/pdf" ||
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Plain-text files: read directly into the textarea.
    if (isText) {
      try {
        const text = await file.text();
        onChange(text.slice(0, MAX_CHARS));
        onFileNameChange(file.name);
      } catch {
        setError("Could not read that file. Try pasting the text instead.");
      }
      return;
    }

    // PDF / DOC / DOCX: accept the file but don't parse it yet (extraction not
    // implemented). Record the name and prompt the user to paste the text.
    if (isDoc) {
      onFileNameChange(file.name);
      setNotice("File uploaded. Paste resume text below if text extraction is not available yet.");
      return;
    }

    setError("Unsupported file. Upload a .txt, .md, .pdf, .doc, or .docx file.");
  };

  const clear = () => {
    onChange("");
    onFileNameChange(null);
    setError(null);
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="rounded-2xl border p-5 mb-6"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.28)" }}
          >
            <FileText size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-[13.5px] leading-tight">Your resume (optional)</h3>
            <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
              Paste text or upload a file (.txt, .md, .pdf, .doc, .docx). Leave empty for the demo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-300 border transition-colors hover:text-white disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          >
            <Upload size={13} />
            Upload
          </button>
          {(value || fileName) && (
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[12px] font-medium text-slate-400 border transition-colors hover:text-white disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
              aria-label="Clear resume"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {notice && (
        <div
          className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 mb-3"
          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.24)" }}
        >
          <span className="text-cyan-300 shrink-0 mt-0.5">
            <FileText size={13} strokeWidth={1.9} />
          </span>
          <p className="text-[11.5px] text-cyan-200/90 leading-snug">{notice}</p>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled}
        rows={5}
        placeholder="Paste resume text here…"
        className="w-full rounded-xl px-3.5 py-3 text-[12.5px] text-slate-200 placeholder:text-slate-600 outline-none resize-y disabled:opacity-60"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)" }}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-slate-600">
          {fileName ? `Loaded: ${fileName}` : value ? `${value.length.toLocaleString()} characters` : "Optional"}
        </span>
        {error && <span className="text-[11px] text-amber-400">{error}</span>}
      </div>

      {/* Optional job description — tailors the cover letter & job matches */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <label className="block text-[11.5px] font-medium text-slate-400 mb-2">
          Job description <span className="text-slate-600">(optional — tailors the results)</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value.slice(0, MAX_CHARS))}
          disabled={disabled}
          rows={3}
          placeholder="Paste a job description to tailor the cover letter and matches…"
          className="w-full rounded-xl px-3.5 py-3 text-[12.5px] text-slate-200 placeholder:text-slate-600 outline-none resize-y disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)" }}
        />
      </div>
    </div>
  );
}
