"use client";

import { useState } from "react";
import { parseResumeFile, ResumeParseError } from "@/lib/resume/parseResumeFile";

interface TranslationUploadProps {
  fileName: string | null;
  /** Called with the extracted résumé TEXT (parsed in the browser) + file name. */
  onParsed: (text: string, fileName: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
  /** Manual paste fallback — the user can type/paste résumé text directly. */
  pastedText: string;
  onPastedTextChange: (text: string) => void;
}

export default function TranslationUpload({
  fileName, onParsed, onClear, onError, pastedText, onPastedTextChange,
}: TranslationUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      // Parsed entirely in the browser — raw bytes NEVER leave the device and
      // are never sent to the API/OpenAI. Only the extracted text is used.
      const { text, fileName: name } = await parseResumeFile(file);
      if (!text.trim()) {
        onError("That file had no readable text. Try a text-based PDF, .docx, or .txt — or paste your résumé below.");
        return;
      }
      onParsed(text, name);
    } catch (err) {
      onError(err instanceof ResumeParseError ? err.message : "Couldn't read that file. Try a .pdf, .docx, or .txt — or paste your résumé below.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div
      id="upload"
      className="rounded-2xl p-6 border transition-all duration-200"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: dragging ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.07)",
        boxShadow: dragging ? "0 0 32px rgba(16,185,129,0.12)" : "none",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: "#10b981" }} />
        <h3 className="text-white font-semibold text-base">Your Resume</h3>
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Upload your résumé or paste its text. We extract the <span className="text-slate-300">text</span> in your browser —
        the file itself never leaves your device — and translate that faithfully.
      </p>

      <label
        htmlFor="tr-resume-upload"
        className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8 px-8 text-center"
        style={{
          borderColor: dragging ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.1)",
          background: dragging ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
      >
        {parsing ? (
          <>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(52,211,153,0.3)" strokeWidth="2" /><path d="M12 3a9 9 0 019 9" stroke="#34d399" strokeWidth="2" strokeLinecap="round" /></svg>
            <p className="text-sm text-slate-300">Reading your résumé…</p>
          </>
        ) : fileName ? (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{fileName}</p>
              <p className="text-xs text-slate-500">Parsed — its text is ready to translate</p>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); onClear(); }} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Remove file</button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110" style={{ background: dragging ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)", border: dragging ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.1)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#34d399" : "#64748b"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">Drop your resume here, or <span style={{ color: dragging ? "#6ee7b7" : "#a78bfa" }} className="transition-colors duration-200">browse files</span></p>
              <p className="text-xs text-slate-500">PDF, DOCX or TXT · parsed in your browser</p>
            </div>
          </>
        )}
        <input
          id="tr-resume-upload"
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>

      {/* Manual paste fallback */}
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-[10px] uppercase tracking-wide text-slate-600">or paste text</span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>
        <textarea
          rows={5}
          value={pastedText}
          maxLength={20000}
          onChange={(e) => onPastedTextChange(e.target.value)}
          placeholder="Paste your résumé text here…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 transition-all input-glow resize-none"
        />
        {!!fileName && !!pastedText.trim() && (
          <p className="text-[11px] text-amber-400/70 mt-1.5">Using your uploaded file. Clear it to translate the pasted text instead.</p>
        )}
      </div>
    </div>
  );
}
