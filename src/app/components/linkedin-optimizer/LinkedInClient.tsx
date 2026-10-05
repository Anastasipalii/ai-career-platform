"use client";

import { useState, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LinkedInFormData } from "@/app/components/linkedin-optimizer/types";
import Toast from "@/app/components/ui/Toast";
import LinkedInHero from "@/app/components/linkedin-optimizer/LinkedInHero";
import LinkedInForm from "@/app/components/linkedin-optimizer/LinkedInForm";
import LinkedInResumeUpload from "@/app/components/linkedin-optimizer/LinkedInResumeUpload";
import LinkedInPreview from "@/app/components/linkedin-optimizer/LinkedInPreview";
import LinkedInResults from "@/app/components/linkedin-optimizer/LinkedInResults";
import LinkedInAIFeatures from "@/app/components/linkedin-optimizer/LinkedInAIFeatures";

interface OptimizeResult {
  headline: string;
  about: string;
  skills: string[];
  suggestedSkills: string[];
}

// Client-side résumé-text cap (the API caps again server-side).
const RESUME_TEXT_CAP = 12000;

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

const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

interface LinkedInClientProps {
  /** When present, reopen a SAVED profile (owner-scoped) for review/edit. */
  initialProfileId?: string;
}

export default function LinkedInClient({ initialProfileId }: LinkedInClientProps) {
  const router = useRouter();
  const [formData, setFormData]         = useState<LinkedInFormData>(INITIAL_FORM);
  const [fileName, setFileName]         = useState<string | null>(null);
  const [resumeText, setResumeText]     = useState<string>("");
  const [optimized, setOptimized]       = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);

  // Editable generated content (initialised from the AI result OR a reopened
  // saved row; never silently overwrites the user's manual source fields).
  const [editHeadline, setEditHeadline] = useState("");
  const [editAbout, setEditAbout]       = useState("");
  const [editSkills, setEditSkills]     = useState(""); // confirmed skills, comma list

  // Persistence: the saved row id. null → not yet saved (next Save INSERTs);
  // set → subsequent Save UPDATEs that same owner-scoped row (no duplicates).
  const [savedId, setSavedId]           = useState<string | null>(null);
  const [reopened, setReopened]         = useState(false); // loaded from a saved row
  const [loadingSaved, setLoadingSaved] = useState<boolean>(!!initialProfileId);

  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Reopen a saved profile: owner-scoped read, NO AI call, stored data only ──
  useEffect(() => {
    if (!initialProfileId) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("linkedin_profiles")
        .select("id, headline, about, skills, optimized_content, created_at")
        .eq("id", initialProfileId)
        .eq("user_id", session.user.id) // defensive owner scoping on top of RLS
        .single();
      if (cancelled) return;
      if (error || !data) { showToast("Couldn't open that saved profile.", "error"); setLoadingSaved(false); return; }

      const row = data as Record<string, unknown>;
      // Backward-compatible: prefer optimized_content, fall back to top-level
      // columns for older rows that predate the suggestedSkills field.
      const oc = (row.optimized_content && typeof row.optimized_content === "object" ? row.optimized_content : {}) as Record<string, unknown>;
      const headline = typeof oc.headline === "string" ? oc.headline : (typeof row.headline === "string" ? row.headline : "");
      const about    = typeof oc.about === "string" ? oc.about : (typeof row.about === "string" ? row.about : "");
      const skills   = asStrArr(oc.skills).length ? asStrArr(oc.skills) : asStrArr(row.skills);

      setEditHeadline(headline);
      setEditAbout(about);
      setEditSkills(skills.join(", "));
      setSuggestedSkills(asStrArr(oc.suggestedSkills));
      setSavedId(String(row.id));
      setReopened(true);
      setOptimized(true);
      setLoadingSaved(false);
    })();
    return () => { cancelled = true; };
  }, [initialProfileId, router, showToast]);

  const handleResumeParsed = useCallback((text: string, name: string) => {
    setResumeText(text.slice(0, RESUME_TEXT_CAP));
    setFileName(name);
    showToast("Résumé parsed — its text will ground your suggestions.", "success");
  }, [showToast]);

  const clearResume = useCallback(() => { setResumeText(""); setFileName(null); }, []);

  const handleOptimize = async () => {
    if (!formData.currentRole.trim()) {
      showToast("Please enter your current role.", "error");
      return;
    }

    setIsOptimizing(true);
    setSaveStatus("idle");

    try {
      const res = await authedFetch("/api/linkedin/optimize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...formData, resumeText: resumeText || undefined }),
      });
      const data = await res.json().catch(() => ({})) as Partial<OptimizeResult> & { error?: string };

      if (!res.ok || data.error) {
        showToast(data.error ?? "Couldn't optimise your profile. Please try again.", "error");
        return;
      }

      const headline = typeof data.headline === "string" ? data.headline : "";
      const about    = typeof data.about === "string" ? data.about : "";
      const skills   = asStrArr(data.skills);
      setEditHeadline(headline);
      setEditAbout(about);
      setEditSkills(skills.join(", "));
      setSuggestedSkills(asStrArr(data.suggestedSkills));
      setOptimized(true);
      // A freshly generated result is a NEW optimization → next Save inserts.
      setSavedId(null);
      setReopened(false);
    } catch {
      showToast("Something went wrong while optimising. Please try again.", "error");
    } finally {
      setIsOptimizing(false);
    }
  };

  const skillsArr = editSkills.split(",").map((s) => s.trim()).filter(Boolean);

  // Explicit save of the CURRENT edited content. Never autosaves.
  // First save INSERTs and captures the id; later saves UPDATE the same
  // owner-scoped row (no duplicate rows).
  const handleSave = async () => {
    if (!optimized) { showToast("Optimise your profile first.", "error"); return; }
    if (!editHeadline.trim() && !editAbout.trim()) { showToast("Nothing to save yet.", "error"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const uid = session.user.id;

    setSaveStatus("saving");
    const headline = editHeadline.trim();
    const about = editAbout.trim();
    const optimizedContent = { headline, about, skills: skillsArr, suggestedSkills };

    if (savedId) {
      // UPDATE the existing owner-scoped row.
      const { error } = await supabase
        .from("linkedin_profiles")
        .update({ headline, about, skills: skillsArr, optimized_content: optimizedContent })
        .eq("id", savedId)
        .eq("user_id", uid);
      if (error) { setSaveStatus("idle"); showToast("Couldn't update your saved profile. Please try again.", "error"); return; }
      setSaveStatus("saved");
      showToast("Saved profile updated.", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    // INSERT once, capture the new id so later saves update this same row.
    const { data, error } = await supabase
      .from("linkedin_profiles")
      .insert({ user_id: uid, headline, about, skills: skillsArr, optimized_content: optimizedContent })
      .select("id")
      .single();
    if (error || !data) { setSaveStatus("idle"); showToast("Couldn't save your profile. Please try again.", "error"); return; }
    setSavedId(String((data as { id: string }).id));
    setSaveStatus("saved");
    showToast("LinkedIn profile saved to your dashboard.", "success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  // Owner-scoped delete of the saved row (explicit confirm handled in Results).
  const handleDelete = async () => {
    if (!savedId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { error } = await supabase
      .from("linkedin_profiles")
      .delete()
      .eq("id", savedId)
      .eq("user_id", session.user.id);
    if (error) { showToast("Couldn't delete this saved profile.", "error"); return; }
    showToast("Saved profile deleted.", "success");
    router.push("/dashboard");
  };

  if (initialProfileId && loadingSaved) {
    return (
      <>
        <LinkedInHero />
        <div className="section-divider" />
        <section className="py-24 text-center">
          <p className="text-sm text-slate-400">Loading your saved profile…</p>
        </section>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <LinkedInHero />
      <div className="section-divider" />

      <section id="optimizer" className="py-16 relative">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(10,102,194,0.05) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">LinkedIn optimizer</span>
            <div className="section-divider flex-1" />
          </div>

          {reopened && (
            <div className="mb-6 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.2)", color: "#93c5fd" }}>
              You&apos;re viewing a saved optimization. Your original résumé and manual inputs weren&apos;t stored — edit the saved content below, then Save to update it.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <LinkedInForm formData={formData} onChange={setFormData} onOptimize={handleOptimize} isOptimizing={isOptimizing} />
              <LinkedInResumeUpload fileName={fileName} onParsed={handleResumeParsed} onClear={clearResume} onError={(m) => showToast(m, "error")} />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <LinkedInResults
                optimized={optimized}
                isOptimizing={isOptimizing}
                headline={editHeadline}
                about={editAbout}
                skillsText={editSkills}
                suggestedSkills={suggestedSkills}
                onHeadlineChange={setEditHeadline}
                onAboutChange={setEditAbout}
                onSkillsChange={setEditSkills}
                onRegenerate={handleOptimize}
                onSave={handleSave}
                saveStatus={saveStatus}
                canDelete={!!savedId}
                onDelete={handleDelete}
                showToast={showToast}
              />
              <LinkedInPreview
                name={formData.fullName}
                role={formData.currentRole}
                experience={formData.experience}
                optimized={optimized}
                headline={editHeadline}
                about={editAbout}
                skills={skillsArr}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <LinkedInAIFeatures />
    </>
  );
}
