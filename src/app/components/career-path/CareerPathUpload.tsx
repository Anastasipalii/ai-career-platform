"use client";

import { useState } from "react";
import { parseResumeFile, ResumeParseError } from "@/lib/resume/parseResumeFile";

interface CareerPathUploadProps {
  fileName: string | null;
  /** Called with the extracted résumé TEXT (parsed in the browser) + file name. */
  onParsed: (text: string, fileName: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}

export default function CareerPathUpload({ fileName, onParsed, onClear, onError }: CareerPathUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      // Parsed entirely in the browser — raw bytes NEVER leave the device and are
      // never sent to the API/OpenAI. Only the extracted text is passed up.
      const { text, fileName: name } = await parseResumeFile(file);
      if (!text.trim()) {
        onError("That file had no readable text. Try a text-based PDF, .docx, or .txt.");
        return;
      }
      onParsed(text, name);
    } catch (err) {
      onError(err instanceof ResumeParseError ? err.message : "Couldn't read that file. Try a .pdf, .docx, or .txt.");
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
        borderColor: dragging ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.07)",
        boxShadow: dragging ? "0 0 32px rgba(236,72,153,0.12)" : "none",
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: "#ec4899" }} />
        <h3 className="text-white font-semibold text-base">Upload Your Resume</h3>
        <span className="text-xs text-slate-600 ml-auto">Optional — grounds the roadmap in your experience</span>
      </div>

      <label
        htmlFor="cp-resume-upload"
        className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 px-8 text-center"
        style={{
          borderColor: dragging ? "rgba(236,72,153,0.6)" : "rgba(255,255,255,0.1)",
          background: dragging ? "rgba(236,72,153,0.05)" : "rgba(255,255,255,0.02)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
      >
        {parsing ? (
          <>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(249,168,212,0.3)" strokeWidth="2" /><path d="M12 3a9 9 0 019 9" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" /></svg>
            <p className="text-sm text-slate-300">Reading your résumé…</p>
          </>
        ) : fileName ? (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.28)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f9a8d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{fileName}</p>
              <p className="text-xs text-slate-500">Parsed — its text will ground your roadmap</p>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); onClear(); }} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Remove file</button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110" style={{ background: dragging ? "rgba(236,72,153,0.14)" : "rgba(255,255,255,0.04)", border: dragging ? "1px solid rgba(236,72,153,0.35)" : "1px solid rgba(255,255,255,0.1)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#f9a8d4" : "#64748b"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">Drop your resume here, or <span style={{ color: dragging ? "#f9a8d4" : "#a78bfa" }} className="transition-colors duration-200">browse files</span></p>
              <p className="text-xs text-slate-500">PDF, DOCX or TXT · parsed in your browser</p>
            </div>
          </>
        )}
        <input
          id="cp-resume-upload"
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
