"use client";

import { useState } from "react";

interface JobMatchActionsProps {
  hasResults: boolean;
}

export default function JobMatchActions({ hasResults }: JobMatchActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Actions</p>
      <div className="flex flex-col gap-2.5">
        {/* Save match */}
        <button
          type="button"
          disabled={!hasResults}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
            boxShadow: hasResults ? "0 0 24px rgba(139,92,246,0.3)" : "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 2h8.5L13 4.5V13H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
            <rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          Save Job Match
        </button>

        {/* Copy keywords */}
        <button
          type="button"
          disabled={!hasResults}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: copied ? "#6ee7b7" : "rgba(255,255,255,0.75)",
          }}
        >
          {copied ? (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M10 5V3.5A1.5 1.5 0 008.5 2h-5A1.5 1.5 0 002 3.5v5A1.5 1.5 0 003.5 10H5" stroke="currentColor" strokeWidth="1.25" />
              </svg>
              Copy Job Keywords
            </>
          )}
        </button>

        {/* Generate resume */}
        <a
          href="/resume-builder"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M10.5 1.5H4a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V4.5l-1.5-3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M10 1.5V5h3.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M5 7.5h5M5 9.5h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Generate Tailored Resume
        </a>

        {/* Generate cover letter */}
        <a
          href="/cover-letter"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 3h11M2 6l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          Generate Cover Letter
        </a>
      </div>

      {!hasResults && (
        <p className="text-xs text-slate-600 text-center mt-3">
          Find matching jobs first to enable actions
        </p>
      )}
    </div>
  );
}
