"use client";

import { useState, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CoverLetterFormData, LANGUAGE_OPTIONS, LanguageOption } from "@/app/components/cover-letter/types";
import type { CandidateIdentity } from "@/lib/coverLetter/identity";
import { buildFullLetter } from "@/lib/coverLetter/buildLetter";
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
  // Real candidate identity — prefilled from the résumé, user-editable.
  fullName:       "",
  email:          "",
  phone:          "",
  location:       "",
  jobTitle:       "",
  company:        "",
  // Extracted résumé text (client-side) — factual background for generation.
  resumeText:     "",
};

const isLanguageOption = (v: string): v is LanguageOption =>
  (LANGUAGE_OPTIONS as string[]).includes(v);

interface CoverLetterClientProps {
  /** When present, reopen this saved cover letter for editing (owner-scoped). */
  initialLetterId?: string;
}

export default function CoverLetterClient({ initialLetterId }: CoverLetterClientProps) {
  const router = useRouter();
  const [formData, setFormData]         = useState<CoverLetterFormData>(INITIAL_FORM);
  const [generated, setGenerated]       = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // The current letter BODY — streamed from the AI and then directly editable.
  const [body, setBody]                 = useState<string>("");
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  // The saved row currently being edited (set on reopen or after a first insert)
  // so repeated saves UPDATE the same record instead of duplicating it.
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Reopen a saved letter for editing ───────────────────────────────────────
  // Loads ONLY what is genuinely stored (company_name, job_title, language,
  // content). The schema has no candidate identity or original résumé/JD, so
  // those fields stay blank — never reconstructed or invented.
  useEffect(() => {
    if (!initialLetterId) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("cover_letters")
        .select("id, company_name, job_title, language, content")
        .eq("id", initialLetterId)
        .eq("user_id", session.user.id) // defensive; RLS already restricts to owner
        .single();
      if (cancelled) return;
      if (error || !data) { showToast("Couldn't open that cover letter.", "error"); return; }

      const row = data as { id: string; company_name: string; job_title: string; language: string; content: string };
      setFormData((prev) => ({
        ...prev,
        company:  row.company_name ?? "",
        jobTitle: row.job_title ?? "",
        language: isLanguageOption(row.language) ? row.language : prev.language,
      }));
      setBody(row.content ?? "");
      setGenerated(true);
      setEditingId(row.id);
      showToast("Loaded your saved cover letter for editing.", "success");
    })();
    return () => { cancelled = true; };
  }, [initialLetterId, router, showToast]);

  // Résumé parsed entirely in the browser (ResumeUpload). We store the extracted
  // TEXT as the factual background and PREFILL only still-empty identity fields,
  // so user edits always win and nothing is fabricated.
  const handleResumeParsed = useCallback(
    ({ text, identity, fileName }: { text: string; identity: CandidateIdentity; fileName: string }) => {
      setFormData((prev) => ({
        ...prev,
        resumeText: text,
        fullName:   prev.fullName || identity.fullName,
        email:      prev.email    || identity.email,
        phone:      prev.phone    || identity.phone,
        location:   prev.location || identity.location,
      }));
      if (fileName) showToast("Résumé parsed — review your details below.", "success");
    },
    [showToast]
  );

  // Explicit (re)generation — the ONLY thing that replaces a manually edited body.
  const handleGenerate = async () => {
    if (!formData.jobDescription.trim()) {
      showToast("Please paste a job description or vacancy URL.", "error");
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    setBody("");

    try {
      const res = await authedFetch("/api/cover-letter/standalone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          jobDescription: formData.jobDescription,
          tone:           formData.tone,
          language:       formData.language,
          fullName:       formData.fullName,
          email:          formData.email,
          phone:          formData.phone,
          location:       formData.location,
          targetRole:     formData.jobTitle,
          company:        formData.company,
          resumeText:     formData.resumeText,
        }),
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
        setBody(accumulated);
      }

      setGenerated(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Generation failed. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save the CURRENT edited letter. Updates the reopened/just-saved record when
  // there is one (no duplicate rows on repeated clicks); inserts otherwise.
  const handleSave = async () => {
    if (!generated || !body.trim()) {
      showToast("Generate a cover letter first.", "error");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");
    const payload = {
      company_name: formData.company.trim()  || "Untitled company",
      job_title:    formData.jobTitle.trim() || "Cover letter",
      language:     formData.language,
      content:      body, // the current edited body is what reopen loads back
    };

    if (editingId) {
      const { error } = await supabase
        .from("cover_letters")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", session.user.id);
      if (error) {
        setSaveStatus("idle");
        showToast("Couldn't update your cover letter. Please try again.", "error");
        return;
      }
      setSaveStatus("saved");
      showToast("Cover letter updated.", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    const { data, error } = await supabase
      .from("cover_letters")
      .insert({ ...payload, user_id: session.user.id })
      .select("id")
      .single();
    if (error || !data) {
      setSaveStatus("idle");
      showToast("Couldn't save your cover letter. Please try again.", "error");
      return;
    }
    setEditingId((data as { id: string }).id); // further saves update this row
    setSaveStatus("saved");
    showToast("Cover letter saved to your dashboard!", "success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  // Copy the COMPLETE real letter (identity + company/role + current body),
  // never just the AI body. Missing fields are omitted, not faked.
  const handleCopy = () => {
    if (!body.trim()) return;
    const letter = buildFullLetter(formData, body);
    navigator.clipboard.writeText(letter)
      .then(() => showToast("Full letter copied to clipboard.", "success"))
      .catch(() => showToast("Couldn't copy to the clipboard.", "error"));
  };

  const handleDownload = () => {
    if (!body.trim()) return;
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

  const hasLetter = generated || body.trim().length > 0;

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
              {editingId ? "Editing a saved cover letter" : "Cover letter generator"}
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — upload first, then form */}
            <div className="flex flex-col gap-5">
              <ResumeUpload onParsed={handleResumeParsed} onError={(m) => showToast(m, "error")} />
              <CoverLetterForm
                formData={formData}
                onChange={setFormData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>

            {/* Right — sticky preview + editable body + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <CoverLetterPreview formData={formData} generated={generated} aiContent={body} />

              {/* Editable letter body — manual edits flow straight to the preview.
                  Only an explicit Generate replaces this text. */}
              {hasLetter && (
                <div
                  className="rounded-2xl p-5 border"
                  style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <label htmlFor="cover-letter-body" className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Edit letter text
                  </label>
                  <textarea
                    id="cover-letter-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={isGenerating}
                    rows={12}
                    spellCheck
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 resize-y leading-relaxed disabled:opacity-60"
                    placeholder="Your generated letter appears here and is fully editable…"
                  />
                  <p className="text-[11px] text-slate-600 mt-2">
                    Edits update the preview instantly. Your text is only replaced if you press Generate again.
                  </p>
                </div>
              )}

              <ExportActions
                name={formData.fullName}
                generated={hasLetter}
                saveStatus={saveStatus}
                onSave={handleSave}
                onCopy={handleCopy}
                onDownload={handleDownload}
              />

              {hasLetter && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Edit any field and click{" "}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Generate
                  </button>{" "}
                  to rewrite from scratch
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
