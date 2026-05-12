"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CoverLetterFormData } from "@/app/components/cover-letter/types";
import Toast from "@/app/components/ui/Toast";
import CoverLetterHero from "@/app/components/cover-letter/CoverLetterHero";
import CoverLetterForm from "@/app/components/cover-letter/CoverLetterForm";
import ResumeUpload from "@/app/components/cover-letter/ResumeUpload";
import CoverLetterPreview from "@/app/components/cover-letter/CoverLetterPreview";
import ExportActions from "@/app/components/cover-letter/ExportActions";
import AIFeatures from "@/app/components/cover-letter/AIFeatures";

const INITIAL_FORM: CoverLetterFormData = {
  jobDescription: "",
  tone:           "Professional",
  language:       "English (US)",
  // Advanced (hidden from form — kept for API compatibility)
  fullName:       "",
  jobTitle:       "",
  company:        "",
  resumeSummary:  "",
  keySkills:      "",
};

export default function CoverLetterClient() {
  const router = useRouter();
  const [formData, setFormData]         = useState<CoverLetterFormData>(INITIAL_FORM);
  const [generated, setGenerated]       = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent]       = useState<string>("");
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleGenerate = async () => {
    if (!formData.jobDescription.trim()) {
      showToast("Please paste a job description or vacancy URL.", "error");
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    setAiContent("");

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? "Generation failed.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");
      const decoder = new TextDecoder();
      let accumulated = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiContent(accumulated);
      }

      setGenerated(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Generation failed. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generated || !aiContent.trim()) {
      showToast("Generate a cover letter first.", "error");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");
    const { error } = await supabase.from("cover_letters").insert({
      user_id:      session.user.id,
      company_name: formData.company   || "Job Application",
      job_title:    formData.jobTitle  || "Cover Letter",
      language:     formData.language,
      content:      aiContent,
    });

    if (error) {
      setSaveStatus("idle");
      showToast(`Save failed: ${error.message}`, "error");
    } else {
      setSaveStatus("saved");
      showToast("Cover letter saved to your dashboard!", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleCopy = () => {
    if (!aiContent) return;
    navigator.clipboard.writeText(aiContent)
      .then(() => showToast("Copied to clipboard!", "success"))
      .catch(() => showToast("Copy failed.", "error"));
  };

  const handleDownload = () => {
    if (!aiContent) return;
    const el = document.getElementById("cover-letter-document");
    if (!el) { showToast("Preview not found.", "error"); return; }

    const win = window.open("", "_blank", "width=800,height=1100");
    if (!win) { showToast("Allow popups to download PDF.", "error"); return; }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>cover-letter</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#fff}
@page{margin:0;size:A4}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 600);
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <CoverLetterHero />
      <div className="section-divider" />

      <section id="generator" className="py-16 relative">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Cover letter generator
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — upload first, then form */}
            <div className="flex flex-col gap-5">
              <ResumeUpload />
              <CoverLetterForm
                formData={formData}
                onChange={setFormData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>

            {/* Right — sticky preview + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <CoverLetterPreview formData={formData} generated={generated} aiContent={aiContent} />
              <ExportActions
                name={formData.fullName}
                generated={generated}
                saveStatus={saveStatus}
                onSave={handleSave}
                onCopy={handleCopy}
                onDownload={handleDownload}
              />

              {generated && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Edit any field and click{" "}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Generate
                  </button>{" "}
                  to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <AIFeatures />
    </>
  );
}
