"use client";

import { useState } from "react";
import { TRANSLATION_LANGUAGES } from "@/app/components/resume-builder/types";

const selectCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-all input-glow cursor-pointer appearance-none";

export default function TranslationPanel() {
  const [source, setSource] = useState<string>("English (US)");
  const [target, setTarget] = useState<string>("German");
  const [status, setStatus] = useState<"idle" | "translating" | "done">("idle");

  const handleTranslate = () => {
    if (source === target) return;
    setStatus("translating");
    setTimeout(() => setStatus("done"), 2200);
    setTimeout(() => setStatus("idle"), 4500);
  };

  return (
    <div
      className="rounded-2xl p-6 border relative overflow-hidden"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 relative z-10">
        <div className="w-1 h-5 rounded-full" style={{ background: "#10b981" }} />
        <h3 className="text-white font-semibold text-base">Resume Translation</h3>
        <div
          className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
          style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          AI
        </div>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed mb-5 relative z-10">
        Write or dictate your resume in your native language, then instantly translate it into
        the language required for your job application.
      </p>

      {/* Language selectors */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3 mb-5">
        {/* Source */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">From</label>
          <div className="relative">
            <select
              className={selectCls}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Swap arrow */}
        <button
          type="button"
          onClick={() => { setSource(target); setTarget(source); }}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-110 self-end mb-0.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#64748b",
          }}
          title="Swap languages"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 5h10M9 2l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 11H4M7 8l-3 3 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Target */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">To</label>
          <div className="relative">
            <select
              className={selectCls}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Warning if same language selected */}
      {source === target && (
        <p className="text-xs text-amber-400/70 mb-4 flex items-center gap-1.5 relative z-10">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1L12 12H1L6.5 1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M6.5 5v3M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Select different source and target languages
        </p>
      )}

      {/* Translate button */}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={source === target || status === "translating"}
        className="relative z-10 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        style={{
          background:
            status === "done"
              ? "linear-gradient(135deg, #059669, #34d399)"
              : "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow:
            status === "translating" || source === target
              ? "none"
              : "0 0 24px rgba(124,58,237,0.3)",
        }}
      >
        {status === "translating" ? (
          <>
            <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
            </svg>
            Translating to {target}…
          </>
        ) : status === "done" ? (
          <>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Translation complete
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.25" />
              <path d="M3 7.5h7.5M3 5h2.5M3 10h2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              <path d="M7.5 4l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Translate Resume
          </>
        )}
      </button>
    </div>
  );
}
