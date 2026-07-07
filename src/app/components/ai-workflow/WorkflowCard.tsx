"use client";

import type {
  StepKind,
  TriggerType,
  WorkflowDefinition,
  WorkflowStatus,
} from "./types";
import { CATEGORY_LABELS } from "./workflows";
import OutputTargets from "./OutputTargets";

// ── Static label maps ─────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  WorkflowStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  available: { label: "Available", color: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  beta: { label: "Beta", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  "coming-soon": { label: "Coming soon", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
};

const STEP_KIND_LABEL: Record<StepKind, string> = {
  "ai-agent": "AI agent",
  n8n: "n8n",
  http: "HTTP",
  transform: "Transform",
  condition: "Condition",
  supabase: "Supabase",
  notify: "Notify",
};

const TRIGGER_LABEL: Record<TriggerType, string> = {
  manual: "Manual",
  schedule: "Scheduled",
  webhook: "Webhook",
  event: "Event",
};

// ── Icons (inline SVG, matching the app's icon style) ─────────────────────────

function NodesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="9" cy="14" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 5.5 8 12M12.5 5.5 10 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function TriggerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6.5 1 2 7h3l-.5 4L9 5H6l.5-4z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
      <path d="M6 3.5V6l1.75 1.25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
}

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const accent =
    workflow.accent ?? {
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.1)",
      border: "rgba(124,58,237,0.2)",
    };
  const status = STATUS_STYLE[workflow.status];
  const runtime =
    workflow.estimatedRuntimeSec != null
      ? `~${Math.round(workflow.estimatedRuntimeSec / 5) * 5}s`
      : null;

  const isRunnable = workflow.status !== "coming-soon";

  return (
    <div
      className="group relative rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 flex flex-col"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent.color}55`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${accent.color}22, 0 8px 32px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent.bg} 0%, transparent 55%)` }}
      />

      {/* Status badge */}
      <div
        className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
      >
        {status.label}
      </div>

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
        style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
      >
        <NodesIcon />
      </div>

      {/* Category + trigger */}
      <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
        <span className="font-medium" style={{ color: accent.color }}>
          {CATEGORY_LABELS[workflow.category]}
        </span>
        <span className="text-slate-700">·</span>
        <span className="inline-flex items-center gap-1">
          <TriggerIcon />
          {TRIGGER_LABEL[workflow.trigger.type]}
        </span>
      </div>

      {/* Title + summary */}
      <h3 className="text-white font-semibold text-base mb-2 leading-snug pr-16">{workflow.name}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-4">{workflow.summary}</p>

      {/* Step pipeline preview */}
      <div className="mt-auto">
        <div className="flex items-center gap-1 flex-wrap mb-4">
          {workflow.steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-1">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.06)" }}
                title={step.name}
              >
                {STEP_KIND_LABEL[step.kind]}
              </span>
              {i < workflow.steps.length - 1 && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="text-slate-700 shrink-0">
                  <path d="M2 4.5h5M5 2.5l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Where this workflow's outputs land in the Dashboard */}
        <OutputTargets slug={workflow.slug} />

        {/* Footer: steps + runtime + action */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>{workflow.steps.length} steps</span>
            {runtime && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon />
                {runtime}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled
            title={isRunnable ? "Execution engine coming soon" : "This workflow is not available yet"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed"
            style={
              isRunnable
                ? { color: accent.color, background: accent.bg, border: `1px solid ${accent.border}`, opacity: 0.75 }
                : { color: "#64748b", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M3 2.5v6l5-3-5-3z" fill="currentColor" />
            </svg>
            {isRunnable ? "Run" : "Soon"}
          </button>
        </div>
      </div>
    </div>
  );
}
