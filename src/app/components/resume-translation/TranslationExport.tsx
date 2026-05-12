"use client";

import { useState } from "react";
import { TranslationFormState } from "@/app/components/resume-translation/types";

interface TranslationExportProps {
  state: TranslationFormState;
  translated: boolean;
  saveStatus?: "idle" | "saving" | "saved";
  onSave?: () => void;
  translatedContent?: string;
}

export default function TranslationExport({
  state,
  translated,
  saveStatus = "idle",
  onSave,
  translatedContent,
}: TranslationExportProps) {
  const [copied, setCopied] = useState(false);

  const filename = state.fileName
    ? state.fileName.replace(/\.[^.]+$/, "") + `-${state.targetLanguage.replace(/[^a-z]/gi, "-").toLowerCase()}`
    : `resume-${state.targetLanguage.replace(/[^a-z]/gi, "-").toLowerCase()}`;

  const handleCopy = () => {
    if (translatedContent) {
      navigator.clipboard.writeText(translatedContent).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
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
          disabled={!translated}
          title={`Download ${filename}.pdf`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: "linear-gradient(135deg, #059669, #7c3aed)",
            boxShadow:  translated ? "0 0 24px rgba(5,150,105,0.3)" : "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download Translated PDF
        </button>

        {/* Copy Text */}
        <button
          type="button"
          disabled={!translated}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.05)",
            border:     "1px solid rgba(255,255,255,0.09)",
            color:      copied ? "#6ee7b7" : "rgba(255,255,255,0.75)",
          }}
        >
          {copied ? (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Copied!</>
          ) : (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" /><path d="M10 5V3.5A1.5 1.5 0 008.5 2h-5A1.5 1.5 0 002 3.5v5A1.5 1.5 0 003.5 10H5" stroke="currentColor" strokeWidth="1.25" /></svg>Copy Translated Text</>
          )}
        </button>

        {/* Save */}
        <button
          type="button"
          disabled={!translated || saveStatus === "saving"}
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: saveStatus === "saved" ? "rgba(16,185,129,0.08)"     : "rgba(255,255,255,0.03)",
            border:     saveStatus === "saved" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.07)",
            color:      saveStatus === "saved" ? "#6ee7b7" : "rgba(255,255,255,0.5)",
          }}
        >
          {saveStatus === "saving" ? (
            <><svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /><path d="M7.5 1.5a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Saving…</>
          ) : saveStatus === "saved" ? (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Saved!</>
          ) : (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2h8.5L13 4.5V13H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" /><rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" /></svg>Save Translation</>
          )}
        </button>
      </div>

      {!translated && (
        <p className="text-xs text-slate-600 text-center mt-3">
          Translate your resume first to enable export
        </p>
      )}
    </div>
  );
}
