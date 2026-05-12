"use client";

import { useState } from "react";
import {
  ResumeFormData,
  ExperienceEntry,
  TRANSLATION_LANGUAGES,
} from "@/app/components/resume-builder/types";

// ── Types ─────────────────────────────────────────────────────────────────────
type AITab       = "generate" | "improve";
type ImproveSection = "summary" | "experience" | "skills";
type ImproveAction  = "improve" | "rewrite" | "shorten" | "translate";

interface GenerateResult {
  summary?: string;
  experienceDescription?: string;
  suggestedSkills?: string[];
  atsKeywords?: string[];
  error?: string;
}

interface AIAssistantPanelProps {
  formData: ResumeFormData;
  onUpdate: (updates: Partial<ResumeFormData>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const EXPERIENCE_OPTIONS = ["< 1 year", "1–2 years", "3–5 years", "6–9 years", "10+ years"] as const;

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="animate-spin shrink-0"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
    >
      <circle
        cx={size / 2} cy={size / 2} r={size / 2 - 1.5}
        stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
      />
      <path
        d={`M ${size / 2} 1.5 a ${size / 2 - 1.5} ${size / 2 - 1.5} 0 0 1 ${size / 2 - 1.5} ${size / 2 - 1.5}`}
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIAssistantPanel({ formData, onUpdate }: AIAssistantPanelProps) {
  const [tab, setTab]         = useState<AITab>("generate");
  const [generating, setGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<ImproveAction | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [preAiData, setPreAiData] = useState<Partial<ResumeFormData> | null>(null);

  // Generate tab state
  const [genJobTitle, setGenJobTitle]   = useState(formData.jobTitle);
  const [genYears, setGenYears]         = useState("3–5 years");
  const [genIndustry, setGenIndustry]   = useState("");
  const [genSkills, setGenSkills]       = useState(formData.skills.join(", "));
  const [genLanguage, setGenLanguage]   = useState("English (US)");

  // Improve tab state
  const [section, setSection]           = useState<ImproveSection>("summary");
  const [translateLang, setTranslateLang] = useState("German");

  const busy = generating || activeAction !== null;

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!genJobTitle.trim()) {
      setError("Please enter a target job title.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          jobTitle:        genJobTitle.trim(),
          yearsExperience: genYears,
          industry:        genIndustry.trim() || "Technology",
          skills:          genSkills.split(",").map((s) => s.trim()).filter(Boolean),
          language:        genLanguage,
        }),
      });

      const data = (await res.json()) as GenerateResult;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Generation failed. Please try again.");
      }

      // Snapshot for undo
      const backup: Partial<ResumeFormData> = {
        summary:    formData.summary,
        skills:     [...formData.skills],
        experience: formData.experience.map((e) => ({ ...e })),
        jobTitle:   formData.jobTitle,
      };
      setPreAiData(backup);

      const updates: Partial<ResumeFormData> = {};

      if (data.summary)               updates.summary = data.summary;

      if (data.suggestedSkills?.length) {
        updates.skills = [...new Set([...formData.skills, ...data.suggestedSkills])];
      }

      if (data.experienceDescription && formData.experience.length > 0) {
        updates.experience = formData.experience.map((exp, i) =>
          i === 0 ? { ...exp, description: data.experienceDescription! } : exp
        );
      } else if (data.experienceDescription) {
        // No existing entries — create a starter entry
        const newEntry: ExperienceEntry = {
          id:          `exp-ai-${Date.now()}`,
          company:     genJobTitle.trim(),
          role:        genJobTitle.trim(),
          startDate:   "",
          endDate:     "Present",
          description: data.experienceDescription,
        };
        updates.experience = [newEntry];
      }

      if (!formData.jobTitle && genJobTitle.trim()) {
        updates.jobTitle = genJobTitle.trim();
      }

      onUpdate(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Improve (streaming) ───────────────────────────────────────────────────
  const handleImprove = async (action: ImproveAction) => {
    // Snapshot the state AT the time the button is clicked
    const baseExperience: ExperienceEntry[] = formData.experience.map((e) => ({ ...e }));

    let currentText = "";
    if (section === "summary") {
      currentText = formData.summary;
    } else if (section === "experience") {
      currentText = formData.experience[0]?.description ?? "";
    } else if (section === "skills") {
      currentText = formData.skills.join(", ");
    }

    if (!currentText.trim()) {
      setError(`The ${section} section is empty — add some content first.`);
      return;
    }

    setActiveAction(action);
    setError(null);

    // Snapshot for undo
    const backup: Partial<ResumeFormData> = {
      summary:    formData.summary,
      experience: baseExperience,
      skills:     [...formData.skills],
    };
    setPreAiData(backup);

    // Apply intermediate streaming text to live preview
    const applyToForm = (text: string) => {
      if (section === "summary") {
        onUpdate({ summary: text });
      } else if (section === "experience") {
        onUpdate({
          experience: baseExperience.map((exp, i) =>
            i === 0 ? { ...exp, description: text } : exp
          ),
        });
      } else if (section === "skills") {
        const parsed = text.split(",").map((s) => s.trim()).filter(Boolean);
        if (parsed.length > 0) onUpdate({ skills: parsed });
      }
    };

    try {
      const res = await fetch("/api/resume/improve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action,
          text:           currentText,
          context:        `${formData.jobTitle || "professional"} resume`,
          targetLanguage: action === "translate" ? translateLang : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(errData.error ?? "Request failed.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      let accumulated = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        applyToForm(accumulated);
      }

      // Ensure final state is applied after stream closes
      applyToForm(accumulated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Improvement failed. Please try again.");
      // Auto-revert on error
      onUpdate(backup);
      setPreAiData(null);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRevert = () => {
    if (preAiData) {
      onUpdate(preAiData);
      setPreAiData(null);
    }
  };

  // ── Current section preview text ──────────────────────────────────────────
  const sectionPreview = (() => {
    if (section === "summary")    return formData.summary || null;
    if (section === "experience") return formData.experience[0]?.description || null;
    if (section === "skills")     return formData.skills.length ? formData.skills.join(", ") : null;
    return null;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#a78bfa" strokeWidth="1.3" strokeLinejoin="round">
              <polygon points="6.5,1 8.3,4.7 12.5,5.1 9.5,7.8 10.4,12 6.5,9.9 2.6,12 3.5,7.8 0.5,5.1 4.7,4.7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            GPT-4o mini
          </span>
        </div>

        {/* Tab pills */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["generate", "improve"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 capitalize"
              style={
                tab === t
                  ? { background: "rgba(124,58,237,0.25)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }
                  : { color: "#64748b", border: "1px solid transparent" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-300 mb-4"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
              <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            <span className="flex-1 leading-relaxed">{error}</span>
            <button type="button" onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none ml-1">×</button>
          </div>
        )}

        {/* Revert banner */}
        {preAiData && !busy && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs mb-4"
            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <span className="text-violet-300">AI changes applied to preview</span>
            <button
              type="button"
              onClick={handleRevert}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              ↩ Revert
            </button>
          </div>
        )}

        {/* ── GENERATE TAB ── */}
        {tab === "generate" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Target Job Title <span className="text-violet-400">*</span></label>
              <input
                className={inputCls}
                placeholder="e.g. Senior Product Designer"
                value={genJobTitle}
                onChange={(e) => setGenJobTitle(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Experience</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={genYears}
                    onChange={(e) => setGenYears(e.target.value)}
                    disabled={busy}
                  >
                    {EXPERIENCE_OPTIONS.map((o) => (
                      <option key={o} value={o} style={{ background: "#0d0d16" }}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Industry</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Technology"
                  value={genIndustry}
                  onChange={(e) => setGenIndustry(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Key Skills (comma-separated)</label>
              <input
                className={inputCls}
                placeholder="e.g. Figma, React, UX Research"
                value={genSkills}
                onChange={(e) => setGenSkills(e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Output Language</label>
              <div className="relative">
                <select
                  className={selectCls}
                  value={genLanguage}
                  onChange={(e) => setGenLanguage(e.target.value)}
                  disabled={busy}
                >
                  {TRANSLATION_LANGUAGES.map((l) => (
                    <option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy || !genJobTitle.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-1"
              style={{
                background:  "linear-gradient(135deg, #7c3aed, #06b6d4)",
                boxShadow:   busy ? "none" : "0 0 20px rgba(124,58,237,0.3)",
              }}
            >
              {generating ? (
                <><Spinner size={15} />Generating…</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                    <polygon points="7,1 8.8,4.9 13,5.3 10,8.1 10.9,12.3 7,10.2 3.1,12.3 4,8.1 1,5.3 5.2,4.9" />
                  </svg>
                  Generate Resume with AI
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-600 text-center -mt-1">
              Updates summary, experience bullets, and skills in the preview
            </p>
          </div>
        )}

        {/* ── IMPROVE TAB ── */}
        {tab === "improve" && (
          <div className="flex flex-col gap-4">
            {/* Section picker */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Section to improve</label>
              <div className="flex gap-1.5">
                {(["summary", "experience", "skills"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize disabled:opacity-50"
                    style={
                      section === s
                        ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }
                        : { background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Current content preview */}
            <div
              className="px-3 py-2.5 rounded-lg text-xs leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.025)",
                border:     "1px solid rgba(255,255,255,0.06)",
                color:      sectionPreview ? "#94a3b8" : "#475569",
                maxHeight:  "76px",
                overflowY:  "auto",
              }}
            >
              {sectionPreview ?? <span className="italic">This section is empty — add content first.</span>}
            </div>

            {/* Action buttons */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Actions</label>
              <div className="grid grid-cols-3 gap-2">
                {(["improve", "rewrite", "shorten"] as const).map((action) => {
                  const isActive = activeAction === action;
                  const labels = { improve: "Improve", rewrite: "Rewrite", shorten: "Shorten" } as const;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleImprove(action)}
                      disabled={busy || !sectionPreview}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        isActive
                          ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.35)" }
                          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      {isActive && <Spinner size={11} />}
                      {labels[action]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Translate */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Translate</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    className={selectCls}
                    value={translateLang}
                    onChange={(e) => setTranslateLang(e.target.value)}
                    disabled={busy}
                  >
                    {TRANSLATION_LANGUAGES.filter((l) => !l.startsWith("English")).map((l) => (
                      <option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>

                <button
                  type="button"
                  onClick={() => handleImprove("translate")}
                  disabled={busy || !sectionPreview}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={
                    activeAction === "translate"
                      ? { background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }
                      : { background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }
                  }
                >
                  {activeAction === "translate" ? (
                    <Spinner size={11} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                      <circle cx="6" cy="6" r="5" />
                      <path d="M1 6h10M6 1a7.5 7.5 0 010 10M6 1a7.5 7.5 0 000 10" />
                    </svg>
                  )}
                  Translate
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 -mt-1">
              Changes stream live into the preview as AI writes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
