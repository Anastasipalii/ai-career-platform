"use client";

import { useState } from "react";
import {
  LinkedInFormData,
  LinkedInTone,
  CareerGoal,
  TONE_OPTIONS,
  TONE_META,
  CAREER_GOALS,
  GOAL_META,
  LANGUAGE_OPTIONS,
} from "@/app/components/linkedin-optimizer/types";

interface LinkedInFormProps {
  formData: LinkedInFormData;
  onChange: (data: LinkedInFormData) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const textareaCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow resize-none";

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
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
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
        border: isActive ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.09)",
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

function VoiceHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs text-emerald-300 mt-2"
      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5 shrink-0" />
      <span>
        <strong>Listening…</strong> Speak naturally — AI will structure your input automatically.
      </span>
    </div>
  );
}

export default function LinkedInForm({
  formData,
  onChange,
  onOptimize,
  isOptimizing,
}: LinkedInFormProps) {
  const [activeMic, setActiveMic] = useState<string | null>(null);

  const set = <K extends keyof LinkedInFormData>(key: K, value: LinkedInFormData[K]) =>
    onChange({ ...formData, [key]: value });

  const toggleGoal = (goal: CareerGoal) => {
    const next = formData.goals.includes(goal)
      ? formData.goals.filter((g) => g !== goal)
      : [...formData.goals, goal];
    set("goals", next);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── 1. Basic Info ── */}
      <Section title="Profile Basics" color="#0a66c2">
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
            <label className="block text-xs text-slate-500 mb-1.5">Current role</label>
            <input
              className={inputCls}
              placeholder="Senior Product Designer"
              value={formData.currentRole}
              onChange={(e) => set("currentRole", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5">Current LinkedIn headline</label>
            <input
              className={inputCls}
              placeholder="Senior Product Designer @ Vercel | UX · Design Systems · AI Products"
              value={formData.headline}
              onChange={(e) => set("headline", e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1.5 text-right tabular-nums">
              {formData.headline.length} / 220
            </p>
          </div>
        </div>
      </Section>

      {/* ── 2. About / Summary ── */}
      <Section
        title="About / Summary"
        color="#7c3aed"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="about" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        <label className="block text-xs text-slate-500 mb-1.5">
          Your current LinkedIn About section (or leave blank to generate from scratch)
        </label>
        <textarea
          className={textareaCls}
          rows={5}
          placeholder="I'm a product designer focused on building intuitive, AI-powered tools that help people work smarter..."
          value={formData.about}
          onChange={(e) => set("about", e.target.value)}
        />
        <div className="flex items-start justify-between mt-1.5 gap-2">
          <VoiceHint show={activeMic === "about"} />
          <p className="text-xs text-slate-600 ml-auto tabular-nums shrink-0">{formData.about.length} chars</p>
        </div>
      </Section>

      {/* ── 3. Work Experience ── */}
      <Section
        title="Work Experience"
        color="#06b6d4"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Dictate</span>
            <MicButton id="experience" activeMic={activeMic} setActiveMic={setActiveMic} />
          </div>
        }
      >
        <label className="block text-xs text-slate-500 mb-1.5">
          Paste your top 1–3 experience bullet points for AI to rewrite
        </label>
        <textarea
          className={textareaCls}
          rows={4}
          placeholder={"Senior Product Designer @ Vercel (Mar 2022 – Present)\n• Led redesign of the developer dashboard, improving onboarding by 40%\n• Built design system across 12 product surfaces"}
          value={formData.experience}
          onChange={(e) => set("experience", e.target.value)}
        />
        <VoiceHint show={activeMic === "experience"} />
      </Section>

      {/* ── 4. Skills ── */}
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
        <label className="block text-xs text-slate-500 mb-1.5">
          Your key skills (comma-separated)
        </label>
        <input
          className={inputCls}
          placeholder="Figma, UX Research, Design Systems, Prototyping, AI/ML Products, React"
          value={formData.skills}
          onChange={(e) => set("skills", e.target.value)}
        />
        <VoiceHint show={activeMic === "skills"} />
      </Section>

      {/* ── 5. Career Goals (text) ── */}
      <Section title="Career Goals" color="#f59e0b">
        <label className="block text-xs text-slate-500 mb-1.5">
          What are you hoping to achieve with an optimised LinkedIn profile?
        </label>
        <textarea
          className={textareaCls}
          rows={3}
          placeholder="Looking to transition into a Head of Design role at a Series B–D AI startup in Europe, open to remote..."
          value={formData.careerGoals}
          onChange={(e) => set("careerGoals", e.target.value)}
        />
      </Section>

      {/* ── 6. Goal selector ── */}
      <Section title="Optimization Goals" color="#10b981">
        <p className="text-xs text-slate-500 mb-4">
          Select all that apply — AI will tailor the language for your specific situation
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CAREER_GOALS.map((goal) => {
            const meta = GOAL_META[goal];
            const active = formData.goals.includes(goal);
            return (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                className="flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-200 hover:-translate-y-0.5"
                style={
                  active
                    ? { background: meta.bg, borderColor: meta.color + "55", boxShadow: `0 0 18px ${meta.bg}` }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <span className="text-lg leading-none">{meta.icon}</span>
                <span
                  className="text-xs font-medium leading-tight"
                  style={{ color: active ? meta.color : "rgba(255,255,255,0.55)" }}
                >
                  {goal}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 7. Tone ── */}
      <Section title="Tone of Voice" color="#ec4899">
        <p className="text-xs text-slate-500 mb-4">Choose how your optimised profile should sound</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TONE_OPTIONS.map((tone) => {
            const meta = TONE_META[tone];
            const active = formData.tone === tone;
            return (
              <button
                key={tone}
                type="button"
                onClick={() => set("tone", tone as LinkedInTone)}
                className="flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5"
                style={
                  active
                    ? { background: meta.bg, borderColor: meta.border, boxShadow: `0 0 20px ${meta.bg}` }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 shrink-0 transition-colors"
                  style={{ background: active ? meta.color : "rgba(255,255,255,0.2)" }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: active ? meta.color : "rgba(255,255,255,0.7)" }}>
                    {tone}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{meta.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 8. Language ── */}
      <Section title="Output Language" color="#a78bfa">
        <label className="block text-xs text-slate-500 mb-1.5">
          Profile will be optimised and written in this language
        </label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none cursor-pointer pr-9"}
            value={formData.language}
            onChange={(e) => set("language", e.target.value as LinkedInFormData["language"])}
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

      {/* ── Optimize button ── */}
      <button
        type="button"
        onClick={onOptimize}
        disabled={isOptimizing}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background: "linear-gradient(135deg, #0a66c2, #7c3aed)",
          boxShadow: isOptimizing ? "none" : "0 0 40px rgba(10,102,194,0.35)",
        }}
      >
        {isOptimizing ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Optimizing your profile…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2l2 5h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
            </svg>
            Optimize My Profile
          </>
        )}
      </button>
    </div>
  );
}
