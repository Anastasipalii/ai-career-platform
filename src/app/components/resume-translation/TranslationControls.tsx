"use client";

import {
  TranslationLanguage,
  TranslationFormState,
  TRANSLATION_LANGUAGES,
  TRANSLATION_OPTIONS,
} from "@/app/components/resume-translation/types";

interface TranslationControlsProps {
  state:        TranslationFormState;
  onChange:     (state: TranslationFormState) => void;
  onTranslate:  () => void;
  isTranslating: boolean;
  translated:   boolean;
}

const selectCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 " +
  "transition-all input-glow appearance-none cursor-pointer pr-10";

export default function TranslationControls({
  state,
  onChange,
  onTranslate,
  isTranslating,
  translated,
}: TranslationControlsProps) {
  const set = <K extends keyof TranslationFormState>(key: K, value: TranslationFormState[K]) =>
    onChange({ ...state, [key]: value });

  const swapLanguages = () =>
    onChange({ ...state, sourceLanguage: state.targetLanguage, targetLanguage: state.sourceLanguage });

  const toggleOption = (id: string) => {
    const next = state.enabledOptions.includes(id)
      ? state.enabledOptions.filter((o) => o !== id)
      : [...state.enabledOptions, id];
    set("enabledOptions", next);
  };

  const sameLanguage = state.sourceLanguage === state.targetLanguage;

  return (
    <div
      className="rounded-2xl border flex flex-col gap-5 p-6"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Language pair */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Languages</label>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          {/* Source */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">From</label>
            <div className="relative">
              <select
                className={selectCls}
                value={state.sourceLanguage}
                onChange={(e) => set("sourceLanguage", e.target.value as TranslationLanguage)}
              >
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} style={{ background: "#0d0d16" }}>{lang}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Swap */}
          <button
            type="button"
            onClick={swapLanguages}
            title="Swap languages"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-110 self-end"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
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
                value={state.targetLanguage}
                onChange={(e) => set("targetLanguage", e.target.value as TranslationLanguage)}
              >
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} style={{ background: "#0d0d16" }}>{lang}</option>
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

        {sameLanguage && (
          <p className="text-xs text-amber-400/70 mt-2.5 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12 12H1L6.5 1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              <path d="M6.5 5v3M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            Source and target must be different languages.
          </p>
        )}
      </div>

      {/* Translation options (3 only) */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Options</label>
        <div className="flex flex-col gap-2">
          {TRANSLATION_OPTIONS.map((opt) => {
            const active = state.enabledOptions.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 hover:border-white/15"
                style={
                  active
                    ? { background: "rgba(16,185,129,0.07)", borderColor: "rgba(16,185,129,0.28)" }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    background: active ? "#10b981" : "rgba(255,255,255,0.05)",
                    border:     active ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: active ? "#f1f5f9" : "rgba(255,255,255,0.55)" }}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-600 ml-2">{opt.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Translate button */}
      <button
        type="button"
        onClick={onTranslate}
        disabled={isTranslating || sameLanguage}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background:   translated
            ? "linear-gradient(135deg, #059669, #34d399)"
            : "linear-gradient(135deg, #059669, #7c3aed)",
          boxShadow:    isTranslating || sameLanguage ? "none" : "0 0 36px rgba(5,150,105,0.3)",
        }}
      >
        {isTranslating ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Translating to {state.targetLanguage}…
          </>
        ) : translated ? (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9l4 4 8-8" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Translation complete — translate again?
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h5.5M3 6h3.5M3 12h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              <path d="M9.5 5l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Translate
          </>
        )}
      </button>
    </div>
  );
}
