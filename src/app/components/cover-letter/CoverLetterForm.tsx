"use client";

import {
  CoverLetterFormData,
  ToneOption,
  TONE_OPTIONS,
  TONE_DESCRIPTIONS,
  LANGUAGE_OPTIONS,
} from "@/app/components/cover-letter/types";

interface CoverLetterFormProps {
  formData: CoverLetterFormData;
  onChange: (data: CoverLetterFormData) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const textareaCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow resize-none";

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const TONE_COLORS: Record<ToneOption, { color: string; bg: string; border: string }> = {
  Professional: { color: "#7c3aed", bg: "rgba(124,58,237,0.1)",  border: "rgba(124,58,237,0.25)" },
  Friendly:     { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.25)" },
  Confident:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  Formal:       { color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)" },
  Creative:     { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  border: "rgba(236,72,153,0.25)" },
};

export default function CoverLetterForm({
  formData,
  onChange,
  onGenerate,
  isGenerating,
}: CoverLetterFormProps) {
  const set = <K extends keyof CoverLetterFormData>(key: K, value: CoverLetterFormData[K]) =>
    onChange({ ...formData, [key]: value });

  return (
    <div className="flex flex-col gap-5">

      {/* ── 1. Your Details ── */}
      <Section title="Your Details" color="#7c3aed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Full name</label>
            <input
              className={inputCls}
              placeholder="Alexandra Chen"
              value={formData.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Target job title</label>
            <input
              className={inputCls}
              placeholder="Senior Product Designer"
              value={formData.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5">Company name</label>
            <input
              className={inputCls}
              placeholder="Vercel"
              value={formData.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── 2. Job Description ── */}
      <Section title="Job Description" color="#06b6d4">
        <label className="block text-xs text-slate-500 mb-1.5">
          Paste the job description — AI uses this to tailor every sentence
        </label>
        <textarea
          className={textareaCls}
          rows={5}
          placeholder={"We are looking for a Senior Product Designer to join our team...\n\nResponsibilities:\n- Lead end-to-end product design\n- Collaborate with engineering and PM"}
          value={formData.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
        />
        <p className="text-xs text-slate-600 mt-1.5 text-right tabular-nums">
          {formData.jobDescription.length} chars
        </p>
      </Section>

      {/* ── 3. Your Background ── */}
      <Section title="Your Background" color="#8b5cf6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Resume summary</label>
            <textarea
              className={textareaCls}
              rows={3}
              placeholder="Senior Product Designer with 6+ years building AI-powered products at Vercel and Linear..."
              value={formData.resumeSummary}
              onChange={(e) => set("resumeSummary", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Key skills</label>
            <input
              className={inputCls}
              placeholder="Figma, UX Research, Design Systems, Prototyping, React"
              value={formData.keySkills}
              onChange={(e) => set("keySkills", e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1.5">Separate skills with commas</p>
          </div>
        </div>
      </Section>

      {/* ── 4. Tone of Voice ── */}
      <Section title="Tone of Voice" color="#f59e0b">
        <p className="text-xs text-slate-500 mb-4">
          Choose how your cover letter should sound to the hiring manager
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
          {TONE_OPTIONS.map((tone) => {
            const isActive = formData.tone === tone;
            const tc = TONE_COLORS[tone];
            return (
              <button
                key={tone}
                type="button"
                onClick={() => set("tone", tone)}
                className="flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5"
                style={
                  isActive
                    ? { background: tc.bg, borderColor: tc.border, boxShadow: `0 0 20px ${tc.bg}` }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 shrink-0 transition-colors"
                  style={{ background: isActive ? tc.color : "rgba(255,255,255,0.2)" }}
                />
                <div>
                  <p
                    className="text-sm font-medium transition-colors"
                    style={{ color: isActive ? tc.color : "rgba(255,255,255,0.7)" }}
                  >
                    {tone}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{TONE_DESCRIPTIONS[tone]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 5. Language ── */}
      <Section title="Output Language" color="#10b981">
        <label className="block text-xs text-slate-500 mb-1.5">
          Cover letter will be generated in this language
        </label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none cursor-pointer pr-9"}
            value={formData.language}
            onChange={(e) =>
              set("language", e.target.value as CoverLetterFormData["language"])
            }
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </Section>

      {/* ── Generate button ── */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow: isGenerating ? "none" : "0 0 40px rgba(124,58,237,0.35)",
        }}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Generating your cover letter…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
            </svg>
            Generate Cover Letter
          </>
        )}
      </button>
    </div>
  );
}
