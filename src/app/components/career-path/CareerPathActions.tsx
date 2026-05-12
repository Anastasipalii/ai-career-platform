"use client";

import { useState } from "react";

interface CareerPathActionsProps {
  hasRoadmap: boolean;
  saveStatus?: "idle" | "saving" | "saved";
  onSave?: () => void;
}

export default function CareerPathActions({ hasRoadmap, saveStatus = "idle", onSave }: CareerPathActionsProps) {
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
        {/* Save roadmap */}
        <button
          type="button"
          disabled={!hasRoadmap || saveStatus === "saving"}
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: saveStatus === "saved" ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #be185d, #ec4899)",
            boxShadow:  hasRoadmap && saveStatus !== "saved" ? "0 0 24px rgba(236,72,153,0.3)" : "none",
          }}
        >
          {saveStatus === "saving" ? (
            <><svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" /><path d="M7.5 1.5a6 6 0 016 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>Saving…</>
          ) : saveStatus === "saved" ? (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>Saved!</>
          ) : (
            <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2h8.5L13 4.5V13H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" /><rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" /></svg>Save Roadmap</>
          )}
        </button>

        {/* Export PDF */}
        <button
          type="button"
          disabled={!hasRoadmap}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export PDF
        </button>

        {/* Generate learning plan */}
        <button
          type="button"
          disabled={!hasRoadmap}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: copied ? "#6ee7b7" : "rgba(255,255,255,0.5)",
          }}
        >
          {copied ? (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Plan copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M4 7V4h7v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 7h11v5a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              </svg>
              Generate Learning Plan
            </>
          )}
        </button>

        {/* Generate resume improvements */}
        <a
          href="/resume-builder"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M12 20h9" /><path d="M10.5 1.5H4a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V4.5l-1.5-3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M5 7.5h5M5 9.5h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Generate Resume Improvements
        </a>
      </div>

      {!hasRoadmap && (
        <p className="text-xs text-slate-600 text-center mt-3">
          Create your roadmap first to enable actions
        </p>
      )}
    </div>
  );
}
