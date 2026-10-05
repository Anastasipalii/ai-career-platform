"use client";

import { useState } from "react";
import { parseResumeFile, ResumeParseError } from "@/lib/resume/parseResumeFile";
import { extractCandidateIdentity, type CandidateIdentity } from "@/lib/coverLetter/identity";

interface ResumeUploadProps {
  /** Called after a file is parsed IN THE BROWSER. Receives the extracted text
   *  (the factual background) and best-effort identity for prefilling fields. */
  onParsed: (result: { text: string; identity: CandidateIdentity; fileName: string }) => void;
  /** Called with a friendly message when parsing fails. */
  onError: (message: string) => void;
}

export default function ResumeUpload({ onParsed, onError }: ResumeUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      // Parsed entirely in the browser — raw bytes never leave the device.
      const { text, fileName: name } = await parseResumeFile(file);
      const identity = extractCandidateIdentity(text);
      setFileName(name);
      onParsed({ text, identity, fileName: name });
    } catch (err) {
      setFileName(null);
      const msg =
        err instanceof ResumeParseError
          ? err.message
          : "Couldn't read that file. Paste your résumé text or try another file.";
      onError(msg);
    } finally {
      setParsing(false);
    }
  };

  const clear = () => {
    setFileName(null);
    onParsed({ text: "", identity: { fullName: "", email: "", phone: "", location: "" }, fileName: "" });
  };

  return (
    <div
      id="upload"
      className="rounded-2xl p-6 border transition-all duration-200"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: dragging ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)",
        boxShadow: dragging ? "0 0 32px rgba(124,58,237,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: "#7c3aed" }} />
        <h3 className="text-white font-semibold text-base">Upload Your Resume</h3>
        <span
          className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: "rgba(124,58,237,0.12)",
            color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          Recommended
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Upload your résumé so the letter is based on your real experience. Parsed in your browser —
        the file never leaves your device. PDF, DOCX, or TXT.
      </p>

      {/* Drop zone */}
      <label
        htmlFor="resume-upload"
        className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 px-8 text-center"
        style={{
          borderColor: dragging ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)",
          background: dragging ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        {parsing ? (
          <>
            <svg className="animate-spin" width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="10" stroke="rgba(167,139,250,0.3)" strokeWidth="2" />
              <path d="M13 3a10 10 0 0110 10" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-slate-300">Reading your résumé…</p>
          </>
        ) : fileName ? (
          /* ── Parsed state ── */
          <>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M9 15l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{fileName}</p>
              <p className="text-xs text-slate-500">Parsed — your details were filled in below for review</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); clear(); }}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Remove file
            </button>
          </>
        ) : (
          /* ── Empty state ── */
          <>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
              style={{
                background: dragging ? "rgba(124,58,237,0.14)" : "rgba(255,255,255,0.04)",
                border: dragging ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#a78bfa" : "#64748b"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">
                Drop your résumé here, or{" "}
                <span className="transition-colors duration-200" style={{ color: dragging ? "#c4b5fd" : "#a78bfa" }}>
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500">PDF, DOCX, or TXT · parsed in your browser</p>
            </div>
          </>
        )}

        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
