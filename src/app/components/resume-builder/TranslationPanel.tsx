"use client";

import { useState } from "react";
import { ResumeFormData, ExperienceEntry, TRANSLATION_LANGUAGES } from "@/app/components/resume-builder/types";

interface TranslationPanelProps {
  formData: ResumeFormData;
  onUpdate: (u: Partial<ResumeFormData>) => void;
  onTargetLanguage?: (lang: string) => void;
}

const selectCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-all input-glow cursor-pointer appearance-none";

export default function TranslationPanel({ formData, onUpdate, onTargetLanguage }: TranslationPanelProps) {
  const [source, setSource] = useState("English (US)");
  const [target, setTarget] = useState("German");
  const [status, setStatus] = useState<"idle" | "translating" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Partial<ResumeFormData> | null>(null);

  const sameLanguage = source === target;

  const handleTranslate = async () => {
    if (sameLanguage) return;

    const textsToTranslate: { key: string; text: string }[] = [];
    if (formData.summary.trim()) textsToTranslate.push({ key: "summary", text: formData.summary });
    formData.experience.forEach((exp, i) => {
      if (exp.description.trim()) textsToTranslate.push({ key: `exp-${i}`, text: exp.description });
    });

    if (!textsToTranslate.length) {
      setError("Add a summary or experience to your resume first.");
      return;
    }

    const backup: Partial<ResumeFormData> = {
      summary: formData.summary,
      experience: formData.experience.map((e) => ({ ...e })),
    };
    setSnapshot(backup);
    setStatus("translating");
    setError(null);
    onTargetLanguage?.(target);

    try {
      for (const item of textsToTranslate) {
        const res = await fetch("/api/resume/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "translate",
            text: item.text,
            context: `${formData.jobTitle || "professional"} resume`,
            targetLanguage: target,
          }),
        });

        if (!res.ok) throw new Error("Translation failed.");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream.");
        const decoder = new TextDecoder();
        let accumulated = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          if (item.key === "summary") {
            onUpdate({ summary: accumulated });
          } else {
            const idx = parseInt(item.key.replace("exp-", ""));
            onUpdate({
              experience: formData.experience.map((exp, i) =>
                i === idx ? ({ ...exp, description: accumulated } as ExperienceEntry) : exp
              ),
            });
          }
        }
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Translation failed.");
      if (snapshot) onUpdate(snapshot);
      onTargetLanguage?.(source);
    }
  };

  const handleUndo = () => {
    if (snapshot) {
      onUpdate(snapshot);
      setSnapshot(null);
      setStatus("idle");
      onTargetLanguage?.(source);
    }
  };

  const swapLanguages = () => {
    setSource(target);
    setTarget(source);
    if (status === "done") {
      setStatus("idle");
      setSnapshot(null);
    }
  };

  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#34d399" strokeWidth="1.25" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="5.5" />
            <path d="M1 6.5h11M6.5 1a8 8 0 010 11M6.5 1a8 8 0 000 11" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-white">Resume Translation</h3>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-300 mb-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
        >
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Undo banner */}
      {status === "done" && snapshot && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs mb-4"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <span className="text-emerald-400">Translated to {target}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            ↩ Undo
          </button>
        </div>
      )}

      {/* Language selectors */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">From</label>
          <div className="relative">
            <select
              className={selectCls}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={status === "translating"}
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang} style={{ background: "#0d0d16" }}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={swapLanguages}
          disabled={status === "translating"}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-110 self-end disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
          title="Swap languages"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 4.5h9M8.5 2l2.5 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 10.5H4M6.5 8l-2.5 2.5 2.5 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5">To</label>
          <div className="relative">
            <select
              className={selectCls}
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                if (status === "done") { setStatus("idle"); setSnapshot(null); }
              }}
              disabled={status === "translating"}
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang} style={{ background: "#0d0d16" }}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {sameLanguage && (
        <p className="text-xs text-amber-400/70 mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L11 11H1L6 1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M6 4.5v3M6 9v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Source and target must be different languages.
        </p>
      )}

      {target === "Arabic" && status !== "translating" && (
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M6 4v3M6 9v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Arabic uses RTL layout — the preview will update automatically.
        </p>
      )}

      {/* Translate button */}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={sameLanguage || status === "translating"}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:
            status === "done"
              ? "linear-gradient(135deg, #059669, #34d399)"
              : "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow: status === "translating" || sameLanguage ? "none" : "0 0 20px rgba(124,58,237,0.25)",
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
            Translate again
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
