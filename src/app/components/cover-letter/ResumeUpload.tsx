"use client";

import { useState } from "react";

export default function ResumeUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.type) || file.name.endsWith(".pdf") || file.name.endsWith(".docx")) {
      setFileName(file.name);
    }
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
          Optional
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Upload your resume so AI can extract your experience, skills, and achievements for a
        more personalised cover letter.
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
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        {fileName ? (
          /* ── Uploaded state ── */
          <>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24"
                fill="none" stroke="#a78bfa" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M9 15l2 2 4-4" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{fileName}</p>
              <p className="text-xs text-slate-500">
                Ready — AI will use this to personalise your letter
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setFileName(null); }}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Remove file
            </button>
          </>
        ) : (
          /* ── Empty state ── */
          <>
            {/* Single upload icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
              style={{
                background: dragging ? "rgba(124,58,237,0.14)" : "rgba(255,255,255,0.04)",
                border: dragging
                  ? "1px solid rgba(124,58,237,0.35)"
                  : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24"
                fill="none"
                stroke={dragging ? "#a78bfa" : "#64748b"}
                strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                className="transition-colors duration-200"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">
                Drop your resume here, or{" "}
                <span
                  className="transition-colors duration-200"
                  style={{ color: dragging ? "#c4b5fd" : "#a78bfa" }}
                >
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500">PDF or DOCX · Max 10 MB</p>
            </div>
          </>
        )}

        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
