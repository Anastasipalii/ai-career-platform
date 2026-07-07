"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, Sparkles, CheckCircle2, Clock, type LucideIcon } from "lucide-react";
import { FLOW_ICONS } from "./flowIcons";
import WorkflowStatusBadge from "./WorkflowStatusBadge";
import { DASHBOARD_TARGETS } from "./dashboardTargets";
import type { FlowStep } from "./flowSteps";

interface NodeDetailPanelProps {
  step: FlowStep | null;
  onClose: () => void;
}

export default function NodeDetailPanel({ step, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {step && (
        <motion.div
          key="wf-backdrop"
          className="fixed inset-0 z-[60]"
          style={{ background: "rgba(3,3,8,0.62)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      )}

      {step && (
        <motion.aside
          key="wf-panel"
          className="fixed inset-y-0 right-0 z-[61] w-full max-w-[440px] overflow-y-auto border-l"
          style={{ background: "rgba(9,9,16,0.98)", borderColor: "rgba(255,255,255,0.08)" }}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
        >
          <PanelBody step={step} onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PanelBody({ step, onClose }: { step: FlowStep; onClose: () => void }) {
  const Icon = FLOW_ICONS[step.iconKey];
  const [g1, g2] = step.gradient;
  const target = step.dashboardTarget ? DASHBOARD_TARGETS[step.dashboardTarget] : null;

  return (
    <div className="relative">
      {/* Header with gradient glow */}
      <div className="relative overflow-hidden px-6 pt-6 pb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div
          className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full"
          style={{ background: `radial-gradient(circle, ${step.accent}30 0%, transparent 65%)` }}
        />

        <div className="relative flex items-start justify-between mb-5">
          <span
            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            STEP {String(step.index).padStart(2, "0")} / 08
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: `0 10px 30px ${step.accent}44` }}
          >
            <Icon size={26} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-xl tracking-tight leading-tight">{step.title}</h2>
            <div className="mt-2">
              <WorkflowStatusBadge status={step.status} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col gap-6">
        <section>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Overview</h4>
          <p className="text-slate-300 text-[13.5px] leading-relaxed">{step.description}</p>
        </section>

        {/* How this step works — user action → AI processing → result */}
        <section className="flex flex-col gap-2.5">
          <StageBlock
            label="User Action"
            icon={MousePointerClick}
            tone="#94a3b8"
            text={step.userAction}
          />
          <StageBlock
            label="AI Processing"
            icon={Sparkles}
            tone={step.accent}
            text={step.aiProcessing}
          />
          <StageBlock
            label="Result"
            icon={CheckCircle2}
            tone="#34d399"
            text={step.result}
          />
        </section>

        {/* Technologies used */}
        <section>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Technologies used</h4>
          <div className="flex flex-wrap gap-2">
            {step.technologies.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-slate-300"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Estimated execution time */}
        <section>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: `${step.accent}12`, border: `1px solid ${step.accent}30` }}
          >
            <span className="inline-flex items-center gap-2 text-slate-300 text-[12.5px] font-medium">
              <Clock size={15} color={step.accent} strokeWidth={1.9} />
              Estimated execution time
            </span>
            <span className="text-white text-[13px] font-semibold tabular-nums">{step.estimatedTime}</span>
          </div>
        </section>

        {/* Outputs */}
        <section>
          <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Outputs</h4>
          <div className="flex flex-wrap gap-2">
            {step.outputs.map((o) => (
              <span
                key={o}
                className="px-2.5 py-1 rounded-lg text-[12px] font-medium"
                style={{ background: `${step.accent}18`, color: step.accent, border: `1px solid ${step.accent}33` }}
              >
                {o}
              </span>
            ))}
          </div>
        </section>

        {/* Dashboard destination */}
        {target && (
          <section>
            <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Saves to Dashboard</h4>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: target.accent.bg, border: `1px solid ${target.accent.border}` }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: target.accent.color }} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: target.accent.color }}>
                  {target.label}
                  {target.planned && <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">new</span>}
                </p>
                <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">{target.description}</p>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {step.route && (
            <Link
              href={step.route}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: `0 0 24px ${step.accent}33` }}
            >
              Open tool
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-300 border transition-colors hover:text-white"
            style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          >
            Close
          </button>
        </div>

        <p className="text-[11px] text-slate-600 text-center pt-1">Illustrative data · demo pipeline</p>
      </div>
    </div>
  );
}

/** Reusable labeled stage row (User Action / AI Processing / Result). */
function StageBlock({
  label,
  icon: Icon,
  tone,
  text,
}: {
  label: string;
  icon: LucideIcon;
  tone: string;
  text: string;
}) {
  return (
    <div
      className="flex gap-3 px-3.5 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${tone}1f`, color: tone, border: `1px solid ${tone}3d` }}
      >
        <Icon size={14} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: tone }}>
          {label}
        </p>
        <p className="text-slate-300 text-[12.5px] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
