"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TranslationFormState } from "@/app/components/resume-translation/types";
import Toast from "@/app/components/ui/Toast";
import TranslationHero from "@/app/components/resume-translation/TranslationHero";
import TranslationUpload from "@/app/components/resume-translation/TranslationUpload";
import TranslationControls from "@/app/components/resume-translation/TranslationControls";
import TranslationPreview from "@/app/components/resume-translation/TranslationPreview";
import TranslationExport from "@/app/components/resume-translation/TranslationExport";
import TranslationAIFeatures from "@/app/components/resume-translation/TranslationAIFeatures";

// Sample resume text used when no file is uploaded
const SAMPLE_RESUME_TEXT = `Senior Product Designer with 6+ years of experience building AI-powered digital products at scale. Led design systems and zero-to-one products at Vercel and Linear, driving measurable improvements in user onboarding and engagement.

Experience:
Senior Product Designer at Vercel (Mar 2022–Present)
- Led redesign of developer dashboard, improving onboarding by 40%
- Built design system used across 12 product surfaces
- Drove 34% increase in deployment success rate through UX improvements

Product Designer at Linear (Jun 2020–Feb 2022)
- Designed core issue tracking and project management workflows
- Reduced onboarding time by 40% through progressive disclosure redesign
- Collaborated with engineering on React component library

Education: Bachelor of Arts, Cognitive Science & HCI — UC Berkeley, 2016–2020
Skills: Figma, UX Research, Design Systems, Prototyping, React, A/B Testing`;

const INITIAL_STATE: TranslationFormState = {
  sourceLanguage: "English (US)",
  targetLanguage: "German",
  enabledOptions: ["formatting", "ats", "titles", "dates"],
  fileName: null,
};

export default function ResumeTranslationClient() {
  const router = useRouter();
  const [state, setState]               = useState<TranslationFormState>(INITIAL_STATE);
  const [translated, setTranslated]     = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiTranslation, setAiTranslation] = useState<string>("");
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleTranslate = async () => {
    if (state.sourceLanguage === state.targetLanguage) {
      showToast("Source and target languages must be different.", "error");
      return;
    }

    setIsTranslating(true);
    setTranslated(false);
    setAiTranslation("");

    try {
      const res = await fetch("/api/resume/improve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:         "translate",
          text:           SAMPLE_RESUME_TEXT,
          context:        "professional resume",
          targetLanguage: state.targetLanguage,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? "Translation failed.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");
      const decoder = new TextDecoder();
      let accumulated = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiTranslation(accumulated);
      }

      setTranslated(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Translation failed. Please try again.", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleStateChange = (next: TranslationFormState) => {
    setState(next);
    if (next.sourceLanguage !== state.sourceLanguage || next.targetLanguage !== state.targetLanguage) {
      setTranslated(false);
      setAiTranslation("");
    }
  };

  const handleSave = async () => {
    if (!translated || !aiTranslation.trim()) {
      showToast("Translate your resume first.", "error");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");
    const { error } = await supabase.from("translations").insert({
      user_id:            session.user.id,
      source_language:    state.sourceLanguage,
      target_language:    state.targetLanguage,
      original_content:   SAMPLE_RESUME_TEXT,
      translated_content: aiTranslation,
    });

    if (error) {
      setSaveStatus("idle");
      showToast(`Save failed: ${error.message}`, "error");
    } else {
      setSaveStatus("saved");
      showToast("Translation saved to your dashboard!", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <TranslationHero />
      <div className="section-divider" />

      <section id="translator" className="py-16 relative">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Resume translator
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
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

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <TranslationPreview state={state} translated={translated} aiTranslation={aiTranslation} />
              <TranslationExport
                state={state}
                translated={translated}
                saveStatus={saveStatus}
                onSave={handleSave}
                translatedContent={aiTranslation}
              />

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
    </>
  );
}
