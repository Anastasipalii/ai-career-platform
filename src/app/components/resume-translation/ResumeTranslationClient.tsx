"use client";

import { useState } from "react";
import { TranslationFormState } from "@/app/components/resume-translation/types";
import TranslationHero from "@/app/components/resume-translation/TranslationHero";
import TranslationUpload from "@/app/components/resume-translation/TranslationUpload";
import TranslationControls from "@/app/components/resume-translation/TranslationControls";
import TranslationPreview from "@/app/components/resume-translation/TranslationPreview";
import TranslationExport from "@/app/components/resume-translation/TranslationExport";
import TranslationAIFeatures from "@/app/components/resume-translation/TranslationAIFeatures";

const INITIAL_STATE: TranslationFormState = {
  sourceLanguage: "English (US)",
  targetLanguage: "German",
  enabledOptions: ["formatting", "ats", "titles", "dates"],
  fileName: null,
};

export default function ResumeTranslationClient() {
  const [state, setState]           = useState<TranslationFormState>(INITIAL_STATE);
  const [translated, setTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = () => {
    if (state.sourceLanguage === state.targetLanguage) return;
    setIsTranslating(true);
    setTranslated(false);
    setTimeout(() => {
      setIsTranslating(false);
      setTranslated(true);
    }, 2200);
  };

  const handleStateChange = (next: TranslationFormState) => {
    setState(next);
    // Reset translated state if languages change
    if (next.sourceLanguage !== state.sourceLanguage || next.targetLanguage !== state.targetLanguage) {
      setTranslated(false);
    }
  };

  return (
    <>
      <TranslationHero />
      <div className="section-divider" />

      {/* ── Main translator ── */}
      <section id="translator" className="py-16 relative">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Resume translator
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — upload + controls */}
            <div className="flex flex-col gap-5">
              <TranslationUpload
                fileName={state.fileName}
                onFileChange={(name) => setState({ ...state, fileName: name })}
              />
              <TranslationControls
                state={state}
                onChange={handleStateChange}
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
                translated={translated}
              />
            </div>

            {/* Right — sticky preview + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <TranslationPreview state={state} translated={translated} />
              <TranslationExport state={state} translated={translated} />

              {translated && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Change the target language and click{" "}
                  <button
                    type="button"
                    onClick={handleTranslate}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
                  >
                    Translate
                  </button>{" "}
                  again to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <TranslationAIFeatures />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(124,58,237,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Apply globally, not just locally
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ job seekers using CareerAI to expand their career
            opportunities across borders.
          </p>
          <button
            type="button"
            onClick={handleTranslate}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #059669, #7c3aed)",
              boxShadow: "0 0 40px rgba(5,150,105,0.35)",
            }}
          >
            Translate My Resume Now
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
