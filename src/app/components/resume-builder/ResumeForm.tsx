"use client";

import { useState, useRef, useEffect } from "react";
import {
  ResumeFormData,
  ExperienceEntry,
  EducationEntry,
  LanguageEntry,
  ProjectEntry,
  CertificationEntry,
  ProfessionalLink,
  CustomSectionItem,
  PROFICIENCY_LEVELS,
} from "@/app/components/resume-builder/types";
import PhotoUpload from "@/app/components/resume-builder/PhotoUpload";
import { useDictation, mergeDictatedText } from "@/lib/resume/useDictation";
import DictatableInput from "@/app/components/resume-builder/DictatableInput";

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
function MicButton({ active, title, onClick }: {
  active: boolean; title: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Stop dictation" : "Start dictation"}
      title={title}
      className="relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 shrink-0"
      style={{
        background: active ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
        border: active ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.09)",
        color: active ? "#ef4444" : "#475569",
      }}
    >
      {active && (
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.18)" }} />
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

/* ─── Voice dictation status / error hint ─── */
function VoiceHint({ listening, error }: { listening: boolean; error: string | null }) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs text-red-300 mt-2"
        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  if (!listening) return null;
  return (
    <div
      aria-live="polite"
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs text-emerald-300 mt-2"
      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5 shrink-0" />
      <span>
        <strong>Listening…</strong> Speak now. Speech is processed by your browser&apos;s speech service.
      </span>
    </div>
  );
}

const PERSONAL_DICTATE = new Set(["fullName", "jobTitle", "location"]);

export default function ResumeForm({ formData, onChange }: ResumeFormProps) {
  const [skillInput, setSkillInput] = useState("");
  const dictation = useDictation();
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const dictateSummary = () =>
    dictation.toggle("summary", (chunk) =>
      onChange({ ...formDataRef.current, summary: mergeDictatedText(formDataRef.current.summary, chunk) })
    );
  const dictateExp = (id: string) =>
    dictation.toggle(`exp-${id}`, (chunk) =>
      onChange({
        ...formDataRef.current,
        experience: formDataRef.current.experience.map((e) =>
          e.id === id ? { ...e, description: mergeDictatedText(e.description, chunk) } : e
        ),
      })
    );
  const dictateProjDesc = (id: string) =>
    dictation.toggle(`proj-${id}`, (chunk) =>
      onChange({
        ...formDataRef.current,
        projects: (formDataRef.current.projects ?? []).map((pr) =>
          pr.id === id ? { ...pr, description: mergeDictatedText(pr.description, chunk) } : pr
        ),
      })
    );
  const dictateCustomItemDesc = (secId: string, itemId: string) =>
    dictation.toggle(`cs-${secId}-${itemId}-desc`, (chunk) =>
      onChange({
        ...formDataRef.current,
        customSections: (formDataRef.current.customSections ?? []).map((sec) =>
          sec.id === secId
            ? { ...sec, items: sec.items.map((it) => it.id === itemId ? { ...it, description: mergeDictatedText(it.description, chunk) } : it) }
            : sec
        ),
      })
    );

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
      { id: `lang-${Date.now()}`, language: "", proficiency: "" },
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

  /* ─── Projects ─── */
  const addProject = () =>
    setField("projects", [
      ...(formData.projects ?? []),
      { id: `proj-${Date.now()}`, name: "", role: "", startDate: "", endDate: "", current: false, description: "", url: "" },
    ]);

  const updateProject = (idx: number, key: keyof ProjectEntry, val: string | boolean) =>
    setField(
      "projects",
      (formData.projects ?? []).map((pr, i) =>
        i === idx ? ({ ...pr, [key]: val } as ProjectEntry) : pr
      )
    );

  const removeProject = (idx: number) =>
    setField("projects", (formData.projects ?? []).filter((_, i) => i !== idx));

  /* ─── Certifications ─── */
  const addCert = () =>
    setField("certifications", [
      ...(formData.certifications ?? []),
      { id: `cert-${Date.now()}`, name: "", issuer: "", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "" },
    ]);

  const updateCert = (idx: number, key: keyof CertificationEntry, val: string) =>
    setField(
      "certifications",
      (formData.certifications ?? []).map((c, i) =>
        i === idx ? ({ ...c, [key]: val } as CertificationEntry) : c
      )
    );

  const removeCert = (idx: number) =>
    setField("certifications", (formData.certifications ?? []).filter((_, i) => i !== idx));

  /* ─── Professional Links ─── */
  const addLink = () =>
    setField("professionalLinks", [
      ...(formData.professionalLinks ?? []),
      { id: `link-${Date.now()}`, label: "", url: "" },
    ]);

  const updateLink = (idx: number, key: keyof ProfessionalLink, val: string) =>
    setField(
      "professionalLinks",
      (formData.professionalLinks ?? []).map((l, i) =>
        i === idx ? ({ ...l, [key]: val } as ProfessionalLink) : l
      )
    );

  const removeLink = (idx: number) =>
    setField("professionalLinks", (formData.professionalLinks ?? []).filter((_, i) => i !== idx));

  /* ─── Custom Sections ─── */
  const addCustomSection = () =>
    setField("customSections", [
      ...(formData.customSections ?? []),
      { id: `cs-${Date.now()}`, title: "", items: [{ id: `csi-${Date.now()}`, heading: "", subheading: "", date: "", description: "", url: "" }] },
    ]);

  const updateCustomSectionTitle = (secIdx: number, title: string) =>
    setField(
      "customSections",
      (formData.customSections ?? []).map((sec, i) => (i === secIdx ? { ...sec, title } : sec))
    );

  const removeCustomSection = (secIdx: number) =>
    setField("customSections", (formData.customSections ?? []).filter((_, i) => i !== secIdx));

  const addCustomItem = (secIdx: number) =>
    setField(
      "customSections",
      (formData.customSections ?? []).map((sec, i) =>
        i === secIdx
          ? { ...sec, items: [...sec.items, { id: `csi-${Date.now()}`, heading: "", subheading: "", date: "", description: "", url: "" }] }
          : sec
      )
    );

  const updateCustomItem = (secIdx: number, itemIdx: number, key: keyof CustomSectionItem, val: string) =>
    setField(
      "customSections",
      (formData.customSections ?? []).map((sec, i) =>
        i === secIdx
          ? { ...sec, items: sec.items.map((it, j) => (j === itemIdx ? ({ ...it, [key]: val } as CustomSectionItem) : it)) }
          : sec
      )
    );

  const removeCustomItem = (secIdx: number, itemIdx: number) =>
    setField(
      "customSections",
      (formData.customSections ?? []).map((sec, i) =>
        i === secIdx ? { ...sec, items: sec.items.filter((_, j) => j !== itemIdx) } : sec
      )
    );

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
              ["fullName",  "Full name",       "Your full name"],
              ["jobTitle",  "Job title",        "Senior Product Designer"],
              ["email",     "Email address",    "alex@email.com"],
              ["phone",     "Phone number",     "+1 (415) 555-0182"],
              ["location",  "Location",         "San Francisco, CA"],
              ["linkedin",  "LinkedIn URL",     "linkedin.com/in/alexchen"],
            ] as [keyof ResumeFormData, string, string][]
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
              {PERSONAL_DICTATE.has(key) ? (
                <DictatableInput
                  id={`personal-${key}`}
                  value={formData[key] as string}
                  onChange={(v) => setField(key, v)}
                  placeholder={placeholder}
                  className={inputCls}
                  ariaLabel={label}
                  dictation={dictation}
                />
              ) : (
                <input
                  className={inputCls}
                  placeholder={placeholder}
                  value={formData[key] as string}
                  onChange={(e) => setField(key, e.target.value)}
                />
              )}
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
            <MicButton
              active={dictation.listening && dictation.activeId === "summary"}
              title={dictation.supported ? "Dictate into your summary" : "Voice dictation isn't supported in this browser"}
              onClick={dictateSummary}
            />
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
          <VoiceHint listening={dictation.listening && dictation.activeId === "summary"} error={dictation.activeId === "summary" ? dictation.error : null} />
          <p className="text-xs text-slate-600 ml-auto tabular-nums">
            {formData.summary.length} chars
          </p>
        </div>
      </Section>

      {/* ── 3. Skills ── */}
      <Section
        title="Skills"
        color="#8b5cf6"
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
          <DictatableInput
            id="skill-input"
            value={skillInput}
            onChange={setSkillInput}
            onKeyDown={handleSkillKey}
            placeholder="Type or dictate a skill, then Enter"
            className={inputCls}
            wrapperClassName="flex-1"
            ariaLabel="Add a skill"
            dictation={dictation}
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-violet-300 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {(
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
      >
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
                  <DictatableInput
                    id={`exp-${exp.id}-company`}
                    value={exp.company}
                    onChange={(v) => updateExp(idx, "company", v)}
                    placeholder="Vercel"
                    className={inputCls}
                    ariaLabel="Company"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Job title</label>
                  <DictatableInput
                    id={`exp-${exp.id}-role`}
                    value={exp.role}
                    onChange={(v) => updateExp(idx, "role", v)}
                    placeholder="Senior Product Designer"
                    className={inputCls}
                    ariaLabel="Job title"
                    dictation={dictation}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-slate-500">
                    Key achievements (one per line)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Dictate</span>
                    <MicButton
                      active={dictation.listening && dictation.activeId === `exp-${exp.id}`}
                      title={dictation.supported ? "Dictate your achievements" : "Voice dictation isn't supported in this browser"}
                      onClick={() => dictateExp(exp.id)}
                    />
                  </div>
                </div>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder={"Led redesign of the dashboard, improving onboarding by 40%\nBuilt component library used across 12 product surfaces"}
                  value={exp.description}
                  onChange={(e) => updateExp(idx, "description", e.target.value)}
                />
                <VoiceHint
                  listening={dictation.listening && dictation.activeId === `exp-${exp.id}`}
                  error={dictation.activeId === `exp-${exp.id}` ? dictation.error : null}
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
      >
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
                  <DictatableInput
                    id={`edu-${edu.id}-institution`}
                    value={edu.institution}
                    onChange={(v) => updateEdu(idx, "institution", v)}
                    placeholder="UC Berkeley"
                    className={inputCls}
                    ariaLabel="Institution"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Degree</label>
                  <DictatableInput
                    id={`edu-${edu.id}-degree`}
                    value={edu.degree}
                    onChange={(v) => updateEdu(idx, "degree", v)}
                    placeholder="Bachelor of Arts"
                    className={inputCls}
                    ariaLabel="Degree"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Field of study</label>
                  <DictatableInput
                    id={`edu-${edu.id}-field`}
                    value={edu.field}
                    onChange={(v) => updateEdu(idx, "field", v)}
                    placeholder="Cognitive Science & HCI"
                    className={inputCls}
                    ariaLabel="Field of study"
                    dictation={dictation}
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
              <DictatableInput
                id={`lang-${lang.id}-name`}
                value={lang.language}
                onChange={(v) => updateLang(idx, "language", v)}
                placeholder="e.g. Spanish"
                className={inputCls}
                wrapperClassName="flex-1"
                ariaLabel="Language"
                dictation={dictation}
              />
              <div className="relative shrink-0 w-36">
                <select
                  className={inputCls + " cursor-pointer appearance-none pr-7"}
                  value={lang.proficiency}
                  onChange={(e) =>
                    updateLang(idx, "proficiency", e.target.value as LanguageEntry["proficiency"])
                  }
                >
                  <option value="">Not specified</option>
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

      {/* ── 7. Projects ── */}
      <Section title="Projects" color="#06b6d4">
        <div className="flex flex-col gap-5 mt-1">
          {(formData.projects ?? []).map((proj, idx) => (
            <div
              key={proj.id}
              className="relative rounded-xl p-4 border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <button
                type="button"
                onClick={() => removeProject(idx)}
                className="absolute top-3 right-3 text-xs text-slate-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Project name</label>
                  <DictatableInput
                    id={`proj-${proj.id}-name`}
                    value={proj.name}
                    onChange={(v) => updateProject(idx, "name", v)}
                    placeholder="Booking platform for Boho Padel Club"
                    className={inputCls}
                    ariaLabel="Project name"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Your role</label>
                  <DictatableInput
                    id={`proj-${proj.id}-role`}
                    value={proj.role}
                    onChange={(v) => updateProject(idx, "role", v)}
                    placeholder="Lead developer"
                    className={inputCls}
                    ariaLabel="Project role"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Link (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="https://example.com"
                    value={proj.url}
                    onChange={(e) => updateProject(idx, "url", e.target.value)}
                    aria-label="Project URL"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Start date</label>
                  <input
                    className={inputCls}
                    placeholder="Jan 2024"
                    value={proj.startDate}
                    onChange={(e) => updateProject(idx, "startDate", e.target.value)}
                    aria-label="Project start date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">End date</label>
                  <input
                    className={inputCls + (proj.current ? " opacity-50" : "")}
                    placeholder={proj.current ? "Present" : "Mar 2024"}
                    value={proj.current ? "" : proj.endDate}
                    disabled={proj.current}
                    onChange={(e) => updateProject(idx, "endDate", e.target.value)}
                    aria-label="Project end date"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proj.current}
                      onChange={(e) => updateProject(idx, "current", e.target.checked)}
                    />
                    This is an ongoing project
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs text-slate-500">Description (one point per line)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Dictate</span>
                      <MicButton
                        active={dictation.listening && dictation.activeId === `proj-${proj.id}`}
                        title={dictation.supported ? "Dictate the project description" : "Voice dictation isn't supported in this browser"}
                        onClick={() => dictateProjDesc(proj.id)}
                      />
                    </div>
                  </div>
                  <textarea
                    className={textareaCls}
                    rows={3}
                    placeholder={"Built the booking and ticketing flow end to end\nIntegrated payments and reduced no-shows by 25%"}
                    value={proj.description}
                    onChange={(e) => updateProject(idx, "description", e.target.value)}
                    aria-label="Project description"
                  />
                  <VoiceHint
                    listening={dictation.listening && dictation.activeId === `proj-${proj.id}`}
                    error={dictation.activeId === `proj-${proj.id}` ? dictation.error : null}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addProject}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
            >
              +
            </span>
            Add project
          </button>
        </div>
      </Section>

      {/* ── 8. Certifications ── */}
      <Section title="Certifications" color="#f59e0b">
        <div className="flex flex-col gap-5 mt-1">
          {(formData.certifications ?? []).map((cert, idx) => (
            <div
              key={cert.id}
              className="relative rounded-xl p-4 border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <button
                type="button"
                onClick={() => removeCert(idx)}
                className="absolute top-3 right-3 text-xs text-slate-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Certification name</label>
                  <DictatableInput
                    id={`cert-${cert.id}-name`}
                    value={cert.name}
                    onChange={(v) => updateCert(idx, "name", v)}
                    placeholder="AWS Certified Solutions Architect"
                    className={inputCls}
                    ariaLabel="Certification name"
                    dictation={dictation}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1.5">Issuer</label>
                  <DictatableInput
                    id={`cert-${cert.id}-issuer`}
                    value={cert.issuer}
                    onChange={(v) => updateCert(idx, "issuer", v)}
                    placeholder="Amazon Web Services"
                    className={inputCls}
                    ariaLabel="Certification issuer"
                    dictation={dictation}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Issue date</label>
                  <input
                    className={inputCls}
                    placeholder="Jun 2023"
                    value={cert.issueDate}
                    onChange={(e) => updateCert(idx, "issueDate", e.target.value)}
                    aria-label="Issue date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Expiration date (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="No expiration"
                    value={cert.expirationDate}
                    onChange={(e) => updateCert(idx, "expirationDate", e.target.value)}
                    aria-label="Expiration date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Credential ID (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="ABC-123456"
                    value={cert.credentialId}
                    onChange={(e) => updateCert(idx, "credentialId", e.target.value)}
                    aria-label="Credential ID"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Credential URL (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="https://credly.com/…"
                    value={cert.credentialUrl}
                    onChange={(e) => updateCert(idx, "credentialUrl", e.target.value)}
                    aria-label="Credential URL"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCert}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              +
            </span>
            Add certification
          </button>
        </div>
      </Section>

      {/* ── 9. Professional Links ── */}
      <Section title="Professional Links" color="#0ea5e9">
        <div className="flex flex-col gap-3">
          {(formData.professionalLinks ?? []).map((link, idx) => (
            <div key={link.id} className="flex items-start gap-2">
              <DictatableInput
                id={`link-${link.id}-label`}
                value={link.label}
                onChange={(v) => updateLink(idx, "label", v)}
                placeholder="LinkedIn"
                className={inputCls}
                wrapperClassName="w-40 shrink-0"
                ariaLabel="Link label"
                dictation={dictation}
              />
              <input
                className={inputCls + " flex-1"}
                placeholder="https://linkedin.com/in/you"
                value={link.url}
                onChange={(e) => updateLink(idx, "url", e.target.value)}
                aria-label="Link URL"
              />
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0 mt-2"
                aria-label="Remove link"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-sky-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(14,165,233,0.1)", color: "#7dd3fc", border: "1px solid rgba(14,165,233,0.2)" }}
            >
              +
            </span>
            Add link
          </button>
        </div>
      </Section>

      {/* ── 10. Custom Sections ── */}
      <Section title="Custom Sections" color="#8b5cf6">
        <div className="flex flex-col gap-5 mt-1">
          {(formData.customSections ?? []).map((sec, secIdx) => (
            <div
              key={sec.id}
              className="rounded-xl p-4 border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DictatableInput
                  id={`cs-${sec.id}-title`}
                  value={sec.title}
                  onChange={(v) => updateCustomSectionTitle(secIdx, v)}
                  placeholder="Section title (e.g. Awards, Publications, Volunteering)"
                  className={inputCls + " font-medium"}
                  wrapperClassName="flex-1"
                  ariaLabel="Custom section title"
                  dictation={dictation}
                />
                <button
                  type="button"
                  onClick={() => removeCustomSection(secIdx)}
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors shrink-0"
                >
                  Remove section
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {sec.items.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    className="relative rounded-lg p-3 border"
                    style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <button
                      type="button"
                      onClick={() => removeCustomItem(secIdx, itemIdx)}
                      className="absolute top-2 right-2 text-[11px] text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Heading</label>
                        <DictatableInput
                          id={`cs-${sec.id}-${item.id}-heading`}
                          value={item.heading}
                          onChange={(v) => updateCustomItem(secIdx, itemIdx, "heading", v)}
                          placeholder="Award / title"
                          className={inputCls}
                          ariaLabel="Item heading"
                          dictation={dictation}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Subheading</label>
                        <DictatableInput
                          id={`cs-${sec.id}-${item.id}-subheading`}
                          value={item.subheading}
                          onChange={(v) => updateCustomItem(secIdx, itemIdx, "subheading", v)}
                          placeholder="Organization / detail"
                          className={inputCls}
                          ariaLabel="Item subheading"
                          dictation={dictation}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Date</label>
                        <input
                          className={inputCls}
                          placeholder="2024"
                          value={item.date}
                          onChange={(e) => updateCustomItem(secIdx, itemIdx, "date", e.target.value)}
                          aria-label="Item date"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Link (optional)</label>
                        <input
                          className={inputCls}
                          placeholder="https://example.com"
                          value={item.url}
                          onChange={(e) => updateCustomItem(secIdx, itemIdx, "url", e.target.value)}
                          aria-label="Item URL"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs text-slate-500">Description</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Dictate</span>
                            <MicButton
                              active={dictation.listening && dictation.activeId === `cs-${sec.id}-${item.id}-desc`}
                              title={dictation.supported ? "Dictate the description" : "Voice dictation isn't supported in this browser"}
                              onClick={() => dictateCustomItemDesc(sec.id, item.id)}
                            />
                          </div>
                        </div>
                        <textarea
                          className={textareaCls}
                          rows={2}
                          placeholder="Details (one point per line)"
                          value={item.description}
                          onChange={(e) => updateCustomItem(secIdx, itemIdx, "description", e.target.value)}
                          aria-label="Item description"
                        />
                        <VoiceHint
                          listening={dictation.listening && dictation.activeId === `cs-${sec.id}-${item.id}-desc`}
                          error={dictation.activeId === `cs-${sec.id}-${item.id}-desc` ? dictation.error : null}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addCustomItem(secIdx)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-violet-400 transition-colors self-start"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-sm leading-none"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    +
                  </span>
                  Add entry
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCustomSection}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors self-start"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-base leading-none"
              style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              +
            </span>
            Add custom section
          </button>
        </div>
      </Section>

    </div>
  );
}
