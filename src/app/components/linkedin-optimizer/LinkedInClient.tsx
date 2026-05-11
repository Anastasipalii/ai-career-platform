"use client";

import { useState } from "react";
import { LinkedInFormData } from "@/app/components/linkedin-optimizer/types";
import LinkedInHero from "@/app/components/linkedin-optimizer/LinkedInHero";
import LinkedInForm from "@/app/components/linkedin-optimizer/LinkedInForm";
import LinkedInResumeUpload from "@/app/components/linkedin-optimizer/LinkedInResumeUpload";
import LinkedInPreview from "@/app/components/linkedin-optimizer/LinkedInPreview";
import LinkedInExportActions from "@/app/components/linkedin-optimizer/LinkedInExportActions";
import LinkedInAIFeatures from "@/app/components/linkedin-optimizer/LinkedInAIFeatures";

const INITIAL_FORM: LinkedInFormData = {
  fullName:    "Alexandra Chen",
  currentRole: "Senior Product Designer",
  headline:    "Senior Product Designer @ Vercel | UX · Design Systems · AI Products",
  about:       "",
  experience:  "",
  skills:      "Figma, UX Research, Design Systems, Prototyping, AI/ML Products, React",
  careerGoals: "",
  tone:        "Professional",
  goals:       ["Job Search"],
  language:    "English (US)",
};

export default function LinkedInClient() {
  const [formData, setFormData]       = useState<LinkedInFormData>(INITIAL_FORM);
  const [optimized, setOptimized]     = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setOptimized(false);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimized(true);
    }, 2200);
  };

  return (
    <>
      <LinkedInHero />
      <div className="section-divider" />

      {/* ── Optimizer ── */}
      <section id="optimizer" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(10,102,194,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              LinkedIn optimizer
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — form + upload */}
            <div className="flex flex-col gap-5">
              <LinkedInForm
                formData={formData}
                onChange={setFormData}
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
              />
              <LinkedInResumeUpload />
            </div>

            {/* Right — sticky preview + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <LinkedInPreview formData={formData} optimized={optimized} />
              <LinkedInExportActions optimized={optimized} />

              {optimized && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Change any setting and click{" "}
                  <button
                    type="button"
                    onClick={handleOptimize}
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Optimize
                  </button>{" "}
                  again to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <LinkedInAIFeatures />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(10,102,194,0.08), rgba(124,58,237,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get found by the right recruiters
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ professionals using CareerAI to turn their LinkedIn profile into an inbound machine.
          </p>
          <button
            type="button"
            onClick={handleOptimize}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #0a66c2, #7c3aed)",
              boxShadow: "0 0 40px rgba(10,102,194,0.35)",
            }}
          >
            Optimize My LinkedIn Profile
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
