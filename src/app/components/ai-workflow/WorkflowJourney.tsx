"use client";

import { FLOW_ICONS } from "./flowIcons";
import { JOURNEY_STEPS, type JourneyStep } from "./journeySteps";

// ── Small labelled icons for the three phases of each step ────────────────────
function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="4.2" r="2.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 12c0-2.3 2-3.8 4.5-3.8S11.5 9.7 11.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function AiIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5l1.1 2.9L11 5.5 8.1 6.6 7 9.5 5.9 6.6 3 5.5l2.9-1.1L7 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="11.2" cy="10.8" r="1" fill="currentColor" />
    </svg>
  );
}
function ResultIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M3 7.4 5.6 10 11 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhaseBlock({
  label,
  text,
  icon,
  tone,
  accent,
}: {
  label: string;
  text: string;
  icon: React.ReactNode;
  tone: "neutral" | "ai" | "result";
  accent: string;
}) {
  const styles =
    tone === "result"
      ? { bg: `${accent}12`, border: `${accent}33`, labelColor: accent }
      : tone === "ai"
        ? { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", labelColor: "#c4b5fd" }
        : { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", labelColor: "#94a3b8" };

  return (
    <div className="rounded-xl p-3.5" style={{ background: styles.bg, border: `1px solid ${styles.border}` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: styles.labelColor }}>
        {icon}
        <span className="text-[10.5px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-slate-300 text-[12.5px] leading-relaxed">{text}</p>
    </div>
  );
}

function JourneyRow({ step, isLast }: { step: JourneyStep; isLast: boolean }) {
  const Icon = FLOW_ICONS[step.iconKey];
  const [g1, g2] = step.gradient;

  return (
    <div
      className="wf-reveal relative flex gap-4 sm:gap-6"
      style={{ animationDelay: `${(step.index - 1) * 0.05}s` }}
    >
      {/* Rail: icon + connecting line */}
      <div className="relative flex flex-col items-center shrink-0">
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-white z-10"
          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: `0 8px 22px ${step.accent}44` }}
        >
          <Icon size={22} strokeWidth={1.75} />
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-2 mb-2"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))" }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 min-w-0 rounded-2xl border p-5 mb-5"
        style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
          <span className="text-[11px] font-mono font-semibold text-slate-500">
            STEP {String(step.index).padStart(2, "0")}
          </span>
          <h3 className="text-white font-semibold text-[17px] tracking-tight">{step.title}</h3>
          <span
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
            style={{ background: `${step.accent}14`, color: step.accent, border: `1px solid ${step.accent}30` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: step.accent }} />
            {step.aiTool}
          </span>
        </div>

        {/* Three phases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PhaseBlock label="User action" text={step.userAction} icon={<UserIcon />} tone="neutral" accent={step.accent} />
          <PhaseBlock label="AI processing" text={step.aiProcessing} icon={<AiIcon />} tone="ai" accent={step.accent} />
          <PhaseBlock label="Result" text={step.result} icon={<ResultIcon />} tone="result" accent={step.accent} />
        </div>

        {/* Dashboard items (final step only) */}
        {step.dashboardItems && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {step.dashboardItems.map((item) => (
              <span
                key={item}
                className="px-2.5 py-1 rounded-lg text-[12px] font-medium"
                style={{ background: "rgba(124,58,237,0.1)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.24)" }}
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkflowJourney() {
  return (
    <section id="journey" className="relative py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-5">
            <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">The journey</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Step-by-step <span className="gradient-text">user journey</span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            From the very first upload to a tracked application — here&apos;s exactly what you do,
            what CareerAI&apos;s AI does behind the scenes, and what you get at every step.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {JOURNEY_STEPS.map((step, i) => (
            <JourneyRow key={step.index} step={step} isLast={i === JOURNEY_STEPS.length - 1} />
          ))}
        </div>
      </div>

      {/* Safe CSS entrance — base state is visible, so cards never get stuck hidden */}
      <style>{`
        @keyframes wfReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        .wf-reveal { animation: wfReveal 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .wf-reveal { animation: none; } }
      `}</style>
    </section>
  );
}
