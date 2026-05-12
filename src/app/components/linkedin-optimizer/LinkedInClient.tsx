"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LinkedInFormData } from "@/app/components/linkedin-optimizer/types";
import Toast from "@/app/components/ui/Toast";
import LinkedInHero from "@/app/components/linkedin-optimizer/LinkedInHero";
import LinkedInForm from "@/app/components/linkedin-optimizer/LinkedInForm";
import LinkedInResumeUpload from "@/app/components/linkedin-optimizer/LinkedInResumeUpload";
import LinkedInPreview from "@/app/components/linkedin-optimizer/LinkedInPreview";
import LinkedInExportActions from "@/app/components/linkedin-optimizer/LinkedInExportActions";
import LinkedInAIFeatures from "@/app/components/linkedin-optimizer/LinkedInAIFeatures";

interface OptimizedContent {
  headline: string;
  about: string;
  skills: string[];
}

const INITIAL_FORM: LinkedInFormData = {
  fullName:    "",
  currentRole: "",
  headline:    "",
  about:       "",
  experience:  "",
  skills:      "",
  careerGoals: "",
  tone:        "Professional",
  goals:       ["Job Search"],
  language:    "English (US)",
};

export default function LinkedInClient() {
  const router = useRouter();
  const [formData, setFormData]         = useState<LinkedInFormData>(INITIAL_FORM);
  const [optimized, setOptimized]       = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<OptimizedContent | null>(null);
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleOptimize = async () => {
    if (!formData.currentRole.trim()) {
      showToast("Please enter your current role.", "error");
      return;
    }

    setIsOptimizing(true);
    setOptimized(false);
    setOptimizedContent(null);

    try {
      const res = await fetch("/api/linkedin/optimize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });

      const data = await res.json() as OptimizedContent & { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Optimisation failed.");
      }

      setOptimizedContent(data);
      setOptimized(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Optimisation failed. Please try again.", "error");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!optimizedContent) { showToast("Optimise your profile first.", "error"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");
    const { error } = await supabase.from("linkedin_profiles").insert({
      user_id:          session.user.id,
      headline:         optimizedContent.headline,
      about:            optimizedContent.about,
      skills:           optimizedContent.skills,
      optimized_content: optimizedContent,
    });

    if (error) {
      setSaveStatus("idle");
      showToast(`Save failed: ${error.message}`, "error");
    } else {
      setSaveStatus("saved");
      showToast("LinkedIn profile saved to your dashboard!", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <LinkedInHero />
      <div className="section-divider" />

      <section id="optimizer" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(10,102,194,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              LinkedIn optimizer
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <LinkedInForm
                formData={formData}
                onChange={setFormData}
                onOptimize={handleOptimize}
                isOptimizing={isOptimizing}
              />
              <LinkedInResumeUpload />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <LinkedInPreview
                formData={formData}
                optimized={optimized}
                aiHeadline={optimizedContent?.headline}
                aiAbout={optimizedContent?.about}
                aiSkills={optimizedContent?.skills}
              />
              <LinkedInExportActions
                optimized={optimized}
                saveStatus={saveStatus}
                onSave={handleSave}
                headline={optimizedContent?.headline}
                about={optimizedContent?.about}
              />

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
    </>
  );
}
