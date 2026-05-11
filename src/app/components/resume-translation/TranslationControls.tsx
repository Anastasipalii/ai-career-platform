"use client";

import {
  TranslationLanguage,
  TranslationFormState,
  TRANSLATION_LANGUAGES,
  TRANSLATION_OPTIONS,
} from "@/app/components/resume-translation/types";

interface TranslationControlsProps {
  state: TranslationFormState;
  onChange: (state: TranslationFormState) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  translated: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow appearance-none cursor-pointer";

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

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

  return (
    <div className="flex flex-col gap-5">

      {/* ── Language Pair ── */}
      <Section title="Language Selection" color="#10b981">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
          {/* Source */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">From</label>
            <div className="relative">
              <select
                className={inputCls + " pr-9"}
                value={state.sourceLanguage}
                onChange={(e) => set("sourceLanguage", e.target.value as TranslationLanguage)}
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

          {/* Swap */}
          <button
            type="button"
            onClick={swapLanguages}
            title="Swap languages"
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-110 self-end mb-0.5"
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
                className={inputCls + " pr-9"}
                value={state.targetLanguage}
                onChange={(e) => set("targetLanguage", e.target.value as TranslationLanguage)}
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

        {/* Same-language warning */}
        {state.sourceLanguage === state.targetLanguage && (
          <p className="text-xs text-amber-400/70 mt-3 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12 12H1L6.5 1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              <path d="M6.5 5v3M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            Source and target languages are the same — please select different languages.
          </p>
        )}
      </Section>

      {/* ── Translation Options ── */}
      <Section title="Translation Options" color="#7c3aed">
        <div className="flex flex-col gap-3">
          {TRANSLATION_OPTIONS.map((opt) => {
            const active = state.enabledOptions.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id)}
                className="flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 hover:border-white/15 group"
                style={
                  active
                    ? { background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.3)" }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                {/* Checkbox */}
                <div
                  className="w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200"
                  style={{
                    width: "18px",
                    height: "18px",
                    background: active ? "#7c3aed" : "rgba(255,255,255,0.05)",
                    border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {active && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p
                    className="text-sm font-medium transition-colors"
                    style={{ color: active ? "#f1f5f9" : "rgba(255,255,255,0.6)" }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Translate button ── */}
      <button
        type="button"
        onClick={onTranslate}
        disabled={isTranslating || state.sourceLanguage === state.targetLanguage}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background:
            translated
              ? "linear-gradient(135deg, #059669, #34d399)"
              : "linear-gradient(135deg, #059669, #7c3aed)",
          boxShadow:
            isTranslating || state.sourceLanguage === state.targetLanguage
              ? "none"
              : "0 0 40px rgba(5,150,105,0.35)",
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
            Translation complete
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h5.5M3 6h3.5M3 12h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              <path d="M9.5 5l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Translate Resume
          </>
        )}
      </button>
    </div>
  );
}
