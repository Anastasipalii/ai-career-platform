"use client";

import { useState } from "react";
import {
  ResumeFormData,
  ExperienceEntry,
  EducationEntry,
  LanguageEntry,
  PROFICIENCY_LEVELS,
} from "@/app/components/resume-builder/types";
import PhotoUpload from "@/app/components/resume-builder/PhotoUpload";
import TranslationPanel from "@/app/components/resume-builder/TranslationPanel";

interface ResumeFormProps {
  formData: ResumeFormData;
  onChange: (data: ResumeFormData) => void;
}

/* ─── Shared styles ─── */
const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const textareaCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow resize-none";

/* ─── Section wrapper ─── */
function Section({
  title,
  color,
  action,
  children,
}: {
  title: string;
  color: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="text-white font-semibold text-base">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─── Mic button ─── */
function MicButton({
  id,
  activeMic,
  setActiveMic,
}: {
  id: string;
  activeMic: string | null;
  setActiveMic: (id: string | null) => void;
}) {
  const isActive = activeMic === id;
  return (
    <button
      type="button"
      onClick={() => setActiveMic(isActive ? null : id)}
      title="Dictate instead of typing"
      className="relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 shrink-0"
      style={{
        background: isActive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
        border: isActive
          ? "1px solid rgba(239,68,68,0.35)"
          : "1px solid rgba(255,255,255,0.09)",
        color: isActive ? "#ef4444" : "#475569",
      }}
    >
      {isActive && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "rgba(239,68,68,0.18)" }}
        />
      )}
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="4" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M2 6.5A4.5 4.5 0 0011 6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="6.5" y1="11" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="4.5" y1="13" x2="8.5" y2="13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/* ─── Voice hint (shown once when any mic is active) ─── */
function VoiceHint({ activeMic }: { activeMic: string | null }) {
  if (!activeMic) return null;
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs text-emerald-300 mt-2"
      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5 shrink-0" />
      <span>
        <strong>Listening…</strong> Speak in your native language and let AI structure your resume automatically.
      </span>
    </div>
  );
}

export default function ResumeForm({ formData, onChange }: ResumeFormProps) {
  const [skillInput, setSkillInput] = useState("");
  const [activeMic, setActiveMic] = useState<string | null>(null);

  /* ─── Generic field update ─── */
  const setField = <K extends keyof ResumeFormData>(
    key: K,
    value: ResumeFormData[K]
  ) => onChange({ ...formData, [key]: value });

  /* ─── Skills ─── */
  const addSkill = () => {
    const parts = skillInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const newSkills = parts.filter((s) => !formData.skills.includes(s));
    if (newSkills.length > 0) {
      setField("skills", [...formData.skills, ...newSkills]);
    }
    setSkillInput("");
  };

  const handleSkillKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
    // Comma immediately commits the current word as a tag
    if (e.key === ",") {
      e.preventDefault();
      const trimmed = skillInput.trim();
      if (trimmed && !formData.skills.includes(trimmed)) {
        setField("skills", [...formData.skills, trimmed]);
      }
      setSkillInput("");
    }
    if (e.key === "Backspace" && !skillInput && formData.skills.length > 0) {
      setField("skills", formData.skills.slice(0, -1));
    }
  };

  /* ─── Experience ─── */
  const addExp = () =>
    setField("experience", [
      ...formData.experience,
      { id: `exp-${Date.now()}`, company: "", role: "", startDate: "", endDate: "", description: "" },
    ]);

  const updateExp = (idx: number, key: keyof ExperienceEntry, val: string) =>
    setField(
      "experience",
      formData.experience.map((e, i) =>
        i === idx ? ({ ...e, [key]: val } as ExperienceEntry) : e
      )
    );

  const removeExp = (idx: number) =>
    setField("experience", formData.experience.filter((_, i) => i !== idx));

  /* ─── Education ─── */
  const addEdu = () =>
    setField("education", [
      ...formData.education,
      { id: `edu-${Date.now()}`, institution: "", degree: "", field: "", startDate: "", endDate: "" },
    ]);

  const updateEdu = (idx: number, key: keyof EducationEntry, val: string) =>
    setField(
      "education",
      formData.education.map((e, i) =>
        i === idx ? ({ ...e, [key]: val } as EducationEntry) : e
      )
    );

  const removeEdu = (idx: number) =>
    setField("education", formData.education.filter((_, i) => i !== idx));

  /* ─── Languages ─── */
  const addLang = () =>
    setField("languages", [
      ...formData.languages,
      { id: `lang-${Date.now()}`, language: "", proficiency: "Fluent" },
    ]);

  const updateLang = (idx: number, key: keyof LanguageEntry, val: string) =>
    setField(
      "languages",
      formData.languages.map((l, i) =>
        i === idx ? ({ ...l, [key]: val } as LanguageEntry) : l
      )
    );

  const removeLang = (idx: number) =>
    setField("languages", formData.languages.filter((_, i) => i !== idx));

  return (
    <div id="builder" className="flex flex-col gap-5">

      {/* ── 1. Personal Information ── */}
      <Section title="Personal Information" color="#7c3aed">
        {/* Photo upload */}
        <PhotoUpload
          photoUrl={formData.photoUrl}
          onChange={(url) => setField("photoUrl", url)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              ["fullName",  "Full name",       "Alexandra Chen"],
              ["jobTitle",  "Job title",        "Senior Product Designer"],
              ["email",     "Email address",    "alex@email.com"],
              ["phone",     "Phone number",     "+1 (415) 555-0182"],
              ["location",  "Location",         "San Francisco, CA"],
              ["linkedin",  "LinkedIn URL",     "linkedin.com/in/alexchen"],
            ] as [keyof ResumeFormData, string, string][]
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
              <input
                className={inputCls}
                placeholder={placeholder}
                value={formData[key] as string}
                onChange={(e) => setField(key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Portfolio / Website</label>
            <input
              className={inputCls}
              placeholder="alexchen.design"
              value={formData.website}
              onChange={(e) => setField("website", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── 2. Professional Summary ── */}
      <Section
        title="Professional Summary"
        color="#06b6d4"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="summary" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        <label className="block text-xs text-slate-500 mb-1.5">
          Write 2–4 sentences highlighting your strongest skills and career focus
        </label>
        <textarea
          className={textareaCls}
          rows={4}
          placeholder="Senior Product Designer with 6+ years of experience building AI-powered products at scale..."
          value={formData.summary}
          onChange={(e) => setField("summary", e.target.value)}
        />
        <div className="flex items-center justify-between mt-1.5">
          <VoiceHint activeMic={activeMic === "summary" ? activeMic : null} />
          <p className="text-xs text-slate-600 ml-auto tabular-nums">
            {formData.summary.length} chars
          </p>
        </div>
      </Section>

      {/* ── 3. Skills ── */}
      <Section
        title="Skills"
        color="#8b5cf6"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="skills" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  color: "#a78bfa",
                }}
              >
                {skill}
                <button
                  type="button"
                  className="opacity-50 hover:opacity-100 transition-opacity leading-none"
                  onClick={() =>
                    setField("skills", formData.skills.filter((s) => s !== skill))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Type a skill and press Enter or comma"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKey}
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-violet-300 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
        <VoiceHint activeMic={activeMic === "skills" ? activeMic : null} />
        {!activeMic && (
          <p className="text-xs text-slate-600 mt-2">
            Press{" "}
            <kbd className="px-1 rounded bg-white/5 text-slate-500">Enter</kbd> or{" "}
            <kbd className="px-1 rounded bg-white/5 text-slate-500">,</kbd> to add
          </p>
        )}
      </Section>

      {/* ── 4. Work Experience ── */}
      <Section
        title="Work Experience"
        color="#f59e0b"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="experience" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        <VoiceHint activeMic={activeMic === "experience" ? activeMic : null} />
        <div className="flex flex-col gap-5 mt-1">
          {formData.experience.map((exp, idx) => (
            <div
              key={exp.id}
              className="relative rounded-xl p-4 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              {formData.experience.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExp(idx)}
                  className="absolute top-3 right-3 text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Company</label>
                  <input
                    className={inputCls}
                    placeholder="Vercel"
                    value={exp.company}
                    onChange={(e) => updateExp(idx, "company", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Job title</label>
                  <input
                    className={inputCls}
                    placeholder="Senior Product Designer"
                    value={exp.role}
                    onChange={(e) => updateExp(idx, "role", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Start date</label>
                  <input
                    className={inputCls}
                    placeholder="Mar 2022"
                    value={exp.startDate}
                    onChange={(e) => updateExp(idx, "startDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">End date</label>
                  <input
                    className={inputCls}
                    placeholder="Present"
                    value={exp.endDate}
                    onChange={(e) => updateExp(idx, "endDate", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  Key achievements (one per line)
                </label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder={"Led redesign of the dashboard, improving onboarding by 40%\nBuilt component library used across 12 product surfaces"}
                  value={exp.description}
                  onChange={(e) => updateExp(idx, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addExp}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              +
            </span>
            Add another position
          </button>
        </div>
      </Section>

      {/* ── 5. Education ── */}
      <Section
        title="Education"
        color="#ec4899"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="education" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        <VoiceHint activeMic={activeMic === "education" ? activeMic : null} />
        <div className="flex flex-col gap-5 mt-1">
          {formData.education.map((edu, idx) => (
            <div
              key={edu.id}
              className="relative rounded-xl p-4 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              {formData.education.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEdu(idx)}
                  className="absolute top-3 right-3 text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Institution</label>
                  <input
                    className={inputCls}
                    placeholder="UC Berkeley"
                    value={edu.institution}
                    onChange={(e) => updateEdu(idx, "institution", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Degree</label>
                  <input
                    className={inputCls}
                    placeholder="Bachelor of Arts"
                    value={edu.degree}
                    onChange={(e) => updateEdu(idx, "degree", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Field of study</label>
                  <input
                    className={inputCls}
                    placeholder="Cognitive Science & HCI"
                    value={edu.field}
                    onChange={(e) => updateEdu(idx, "field", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Start year</label>
                  <input
                    className={inputCls}
                    placeholder="Sep 2016"
                    value={edu.startDate}
                    onChange={(e) => updateEdu(idx, "startDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">End year</label>
                  <input
                    className={inputCls}
                    placeholder="May 2020"
                    value={edu.endDate}
                    onChange={(e) => updateEdu(idx, "endDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addEdu}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-pink-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(236,72,153,0.1)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.2)" }}
            >
              +
            </span>
            Add another entry
          </button>
        </div>
      </Section>

      {/* ── 6. Languages ── */}
      <Section title="Languages" color="#10b981">
        <div className="flex flex-col gap-3">
          {formData.languages.map((lang, idx) => (
            <div key={lang.id} className="flex items-center gap-3">
              <input
                className={inputCls + " flex-1"}
                placeholder="e.g. Spanish"
                value={lang.language}
                onChange={(e) => updateLang(idx, "language", e.target.value)}
              />
              <div className="relative shrink-0 w-36">
                <select
                  className={inputCls + " cursor-pointer appearance-none pr-7"}
                  value={lang.proficiency}
                  onChange={(e) =>
                    updateLang(idx, "proficiency", e.target.value as LanguageEntry["proficiency"])
                  }
                >
                  {PROFICIENCY_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {formData.languages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLang(idx)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addLang}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              +
            </span>
            Add language
          </button>
        </div>
      </Section>

      {/* ── 7. Translation ── */}
      <TranslationPanel />
    </div>
  );
}
