"use client";

import { useState } from "react";

interface JobMatchActionsProps {
  hasResults: boolean;
  /** Real keywords aggregated from the displayed real jobs. */
  keywords: string[];
  onToast: (message: string, type: "success" | "error") => void;
}

export default function JobMatchActions({ hasResults, keywords, onToast }: JobMatchActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = keywords.join(", ");
    if (!text) { onToast("No keywords to copy yet.", "error"); return; }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setCopied(true);                       // only after a SUCCESSFUL copy
      onToast("Keywords copied to clipboard.", "success");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onToast("Couldn't copy to the clipboard.", "error");
    }
  };

  return (
    <div className="rounded-2xl p-5 border" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Actions</p>
      <div className="flex flex-col gap-2.5">
        {/* Copy keywords — copies the REAL displayed keywords; success only after a real copy. */}
        <button
          type="button"
          disabled={!hasResults || keywords.length === 0}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: copied ? "#6ee7b7" : "rgba(255,255,255,0.75)" }}
        >
          {copied ? (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" /><path d="M10 5V3.5A1.5 1.5 0 008.5 2h-5A1.5 1.5 0 002 3.5v5A1.5 1.5 0 003.5 10H5" stroke="currentColor" strokeWidth="1.25" /></svg>
              Copy Job Keywords
            </>
          )}
        </button>

        {/* Real navigations to the other tools. */}
        <a href="/resume-builder" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 1.5H4a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V4.5l-1.5-3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /><path d="M10 1.5V5h3.5" stroke="currentColor" strokeWidth="1.25" /></svg>
          Build a Tailored Resume
        </a>
        <a href="/cover-letter" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" /><path d="M2 3h11M2 6l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Write a Cover Letter
        </a>
      </div>

      {!hasResults && (
        <p className="text-xs text-slate-600 text-center mt-3">Find matching jobs first to enable actions</p>
      )}
    </div>
  );
}
