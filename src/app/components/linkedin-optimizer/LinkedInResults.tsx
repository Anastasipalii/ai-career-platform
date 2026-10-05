"use client";

import { useState } from "react";

interface LinkedInResultsProps {
  optimized: boolean;
  isOptimizing: boolean;
  headline: string;
  about: string;
  skillsText: string;        // confirmed skills as an editable comma list
  suggestedSkills: string[]; // read-only suggestions (NOT confirmed facts)
  onHeadlineChange: (v: string) => void;
  onAboutChange: (v: string) => void;
  onSkillsChange: (v: string) => void;
  onRegenerate: () => void;
  onSave: () => void;
  saveStatus: "idle" | "saving" | "saved";
  canDelete: boolean;
  onDelete: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function LinkedInResults({
  optimized, isOptimizing, headline, about, skillsText, suggestedSkills,
  onHeadlineChange, onAboutChange, onSkillsChange, onRegenerate, onSave, saveStatus, canDelete, onDelete, showToast,
}: LinkedInResultsProps) {
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!optimized) return null;

  // Copy the CURRENT edited content; report success ONLY after a resolved write.
  const copy = async (label: string, text: string) => {
    if (!text.trim()) { showToast(`Nothing to copy for ${label} yet.`, "error"); return; }
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied — paste it into LinkedIn.`, "success");
    } catch {
      showToast(`Couldn't access your clipboard. Select the ${label} text and copy it manually.`, "error");
    }
  };

  const skillsArr = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
  const copyAll = () => {
    const parts = [
      headline.trim() && `HEADLINE\n${headline.trim()}`,
      about.trim() && `ABOUT\n${about.trim()}`,
      skillsArr.length && `SKILLS\n${skillsArr.join(", ")}`,
    ].filter(Boolean);
    void copy("Full profile", parts.join("\n\n"));
  };

  const fieldStyle = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow resize-none";
  const copyBtn = "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all hover:opacity-90";

  return (
    <div className="rounded-2xl p-5 border flex flex-col gap-5" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Review &amp; edit</p>
        <span className="text-[10px] text-slate-500">Editable — changes are used for Copy &amp; Save</span>
      </div>

      {/* Headline */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-slate-400">Headline</label>
          <button type="button" className={copyBtn} style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.25)" }} onClick={() => copy("Headline", headline)}>Copy</button>
        </div>
        <textarea rows={2} className={fieldStyle} value={headline} maxLength={400} onChange={(e) => onHeadlineChange(e.target.value)} placeholder="Your generated headline…" />
      </div>

      {/* About */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-slate-400">About</label>
          <button type="button" className={copyBtn} style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.25)" }} onClick={() => copy("About section", about)}>Copy</button>
        </div>
        <textarea rows={8} className={fieldStyle} value={about} maxLength={4000} onChange={(e) => onAboutChange(e.target.value)} placeholder="Your generated About section…" />
      </div>

      {/* Confirmed skills (editable) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-slate-400">Skills <span className="text-slate-600">(from your input — comma separated)</span></label>
          <button type="button" className={copyBtn} style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.25)" }} onClick={() => copy("Skills", skillsArr.join(", "))}>Copy</button>
        </div>
        <textarea rows={2} className={fieldStyle} value={skillsText} maxLength={1000} onChange={(e) => onSkillsChange(e.target.value)} placeholder="Skills drawn from the details you supplied…" />
      </div>

      {/* Suggested skills — clearly separate, NOT presented as confirmed facts */}
      {suggestedSkills.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <p className="text-[11px] font-medium text-amber-300 mb-2">Suggested keywords — add only the ones that are genuinely true for you</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedSkills.map((s) => (
              <button key={s} type="button" onClick={() => copy("Keyword", s)} className="text-[10px] px-2 py-0.5 rounded-full hover:opacity-80" style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)" }}>{s}</button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">These are ideas, not facts about you. CareerAI did not add them to your headline, About, or Skills.</p>
        </div>
      )}

      {/* Copy All + Regenerate */}
      <div className="flex gap-2.5">
        <button type="button" onClick={copyAll} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #0a66c2, #7c3aed)" }}>Copy all</button>
        {confirmRegen ? (
          <>
            <button type="button" onClick={() => setConfirmRegen(false)} className="py-2.5 px-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
            <button type="button" disabled={isOptimizing} onClick={() => { setConfirmRegen(false); onRegenerate(); }} className="py-2.5 px-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>Replace</button>
          </>
        ) : (
          <button type="button" disabled={isOptimizing} onClick={() => setConfirmRegen(true)} className="py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}>
            {isOptimizing ? "Working…" : "Regenerate"}
          </button>
        )}
      </div>
      {confirmRegen && <p className="text-[11px] text-amber-300/80 -mt-2">Regenerating replaces your current edited text with a fresh AI version.</p>}

      {/* Save */}
      <button
        type="button"
        disabled={saveStatus === "saving"}
        onClick={onSave}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
        style={{
          background: saveStatus === "saved" ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
          border: saveStatus === "saved" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.07)",
          color: saveStatus === "saved" ? "#6ee7b7" : "rgba(255,255,255,0.7)",
        }}
      >
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved to your dashboard" : "Save to CareerAI"}
      </button>

      {canDelete && (
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
            <button type="button" onClick={() => { setConfirmDelete(false); onDelete(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>Delete permanently</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90" style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>Delete saved profile</button>
        )
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        CareerAI generates suggestions from the details you provide. Review and edit them, copy what you want, then paste it into LinkedIn yourself. CareerAI does not read or post to your LinkedIn profile.
      </p>
    </div>
  );
}
