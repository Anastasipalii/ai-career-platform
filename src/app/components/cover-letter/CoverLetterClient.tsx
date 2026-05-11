"use client";

import { useState } from "react";
import { CoverLetterFormData } from "@/app/components/cover-letter/types";
import CoverLetterHero from "@/app/components/cover-letter/CoverLetterHero";
import CoverLetterForm from "@/app/components/cover-letter/CoverLetterForm";
import ResumeUpload from "@/app/components/cover-letter/ResumeUpload";
import CoverLetterPreview from "@/app/components/cover-letter/CoverLetterPreview";
import ExportActions from "@/app/components/cover-letter/ExportActions";
import AIFeatures from "@/app/components/cover-letter/AIFeatures";

const INITIAL_FORM: CoverLetterFormData = {
  fullName:      "Alexandra Chen",
  jobTitle:      "Senior Product Designer",
  company:       "Vercel",
  jobDescription: "",
  resumeSummary:  "Senior Product Designer with 6+ years building AI-powered products at scale. Led design systems at Vercel and Linear, driving measurable improvements in user onboarding and engagement.",
  keySkills:     "Figma, UX Research, Design Systems, Prototyping, React",
  tone:          "Professional",
  language:      "English (US)",
};

export default function CoverLetterClient() {
  const [formData, setFormData]       = useState<CoverLetterFormData>(INITIAL_FORM);
  const [generated, setGenerated]     = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <>
      <CoverLetterHero />
      <div className="section-divider" />

      {/* ── Builder ── */}
      <section id="generator" className="py-16 relative">
        {/* Background orb */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Cover letter generator
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — form + upload */}
            <div className="flex flex-col gap-5">
              <CoverLetterForm
                formData={formData}
                onChange={setFormData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
              <ResumeUpload />
            </div>

            {/* Right — sticky: preview + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <CoverLetterPreview formData={formData} generated={generated} />
              <ExportActions name={formData.fullName} generated={generated} />

              {/* Re-generate hint */}
              {generated && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Change any field and click{" "}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Generate
                  </button>{" "}
                  again to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <AIFeatures />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to land your next interview?
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ job seekers who use CareerAI to write cover letters that get responses.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              boxShadow: "0 0 40px rgba(124,58,237,0.35)",
            }}
          >
            Generate My Cover Letter
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
