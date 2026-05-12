"use client";

import {
  CoverLetterFormData,
  ToneOption,
  TONE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/app/components/cover-letter/types";

interface CoverLetterFormProps {
  formData:     CoverLetterFormData;
  onChange:     (data: CoverLetterFormData) => void;
  onGenerate:   () => void;
  isGenerating: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm " +
  "text-slate-200 placeholder-slate-500 transition-all input-glow";

const TONE_COLORS: Record<ToneOption, { color: string; bg: string; border: string }> = {
  Professional: { color: "#7c3aed", bg: "rgba(124,58,237,0.12)",  border: "rgba(124,58,237,0.35)" },
  Friendly:     { color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.35)"  },
  Confident:    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)" },
};

export default function CoverLetterForm({
  formData,
  onChange,
  onGenerate,
  isGenerating,
}: CoverLetterFormProps) {
  const set = <K extends keyof CoverLetterFormData>(key: K, value: CoverLetterFormData[K]) =>
    onChange({ ...formData, [key]: value });

  return (
    <div
      className="rounded-2xl border flex flex-col gap-5 p-6"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Job description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Job Description or Vacancy URL
        </label>
        <textarea
          className={inputCls + " resize-none"}
          rows={7}
          placeholder={"Paste the job description or vacancy URL here.\n\nThe more detail you provide, the more personalised and relevant your cover letter will be."}
          value={formData.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
        />
        <p className="text-xs text-slate-600 text-right mt-1.5 tabular-nums">
          {formData.jobDescription.length} chars
        </p>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Tone of Voice
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {TONE_OPTIONS.map((tone) => {
            const active = formData.tone === tone;
            const tc = TONE_COLORS[tone];
            return (
              <button
                key={tone}
                type="button"
                onClick={() => set("tone", tone)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all duration-200 hover:-translate-y-0.5"
                style={
                  active
                    ? { background: tc.bg, borderColor: tc.border, boxShadow: `0 0 16px ${tc.bg}` }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <span
                  className="text-sm font-semibold transition-colors"
                  style={{ color: active ? tc.color : "rgba(255,255,255,0.6)" }}
                >
                  {tone}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Output Language
        </label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none cursor-pointer pr-10"}
            value={formData.language}
            onChange={(e) => set("language", e.target.value as CoverLetterFormData["language"])}
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang} style={{ background: "#0d0d16" }}>{lang}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background:  "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow:   isGenerating ? "none" : "0 0 40px rgba(124,58,237,0.35)",
        }}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Generating your cover letter…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="white" fillOpacity="0.15" />
            </svg>
            Generate Cover Letter
          </>
        )}
      </button>
    </div>
  );
}
