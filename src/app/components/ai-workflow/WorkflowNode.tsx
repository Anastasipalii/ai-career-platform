"use client";

import { motion } from "framer-motion";
import { FLOW_ICONS } from "./flowIcons";
import WorkflowStatusBadge from "./WorkflowStatusBadge";
import type { FlowStep } from "./flowSteps";

interface WorkflowNodeProps {
  step: FlowStep;
  active: boolean;
  onSelect: () => void;
}

export default function WorkflowNode({ step, active, onSelect }: WorkflowNodeProps) {
  const Icon = FLOW_ICONS[step.iconKey];
  const running = step.status === "running";
  const completed = step.status === "completed";
  const [g1, g2] = step.gradient;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="group relative shrink-0 w-[196px] rounded-2xl p-4 text-left outline-none"
      style={{
        background: "rgba(13,13,22,0.78)",
        border: `1px solid ${active ? `${step.accent}99` : "rgba(255,255,255,0.08)"}`,
        boxShadow: active
          ? `0 0 0 1px ${step.accent}55, 0 16px 48px ${step.accent}26`
          : "0 8px 28px rgba(0,0,0,0.28)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Ambient glow (stronger when running or active) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, ${step.accent}22 0%, transparent 60%)`,
          opacity: running || active ? 1 : 0,
        }}
      />

      {/* Left / right connector ports */}
      <span
        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
        style={{ background: completed || running ? step.accent : "rgba(255,255,255,0.16)" }}
      />
      <span
        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
        style={{ background: completed ? step.accent : "rgba(255,255,255,0.16)" }}
      />

      <div className="relative flex items-start justify-between mb-3">
        {/* Icon badge */}
        <div className="relative">
          {running && (
            <motion.span
              className="absolute inset-0 rounded-xl"
              style={{ boxShadow: `0 0 0 2px ${step.accent}` }}
              animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <div
            className="relative w-11 h-11 rounded-xl flex items-center justify-center text-white"
            style={{
              background: `linear-gradient(135deg, ${g1}, ${g2})`,
              boxShadow: `0 6px 18px ${step.accent}44`,
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
          </div>
          {completed && (
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "#10b981", border: "2px solid #0d0d16" }}
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.2 4 7l4-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        {/* Step index */}
        <span
          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {String(step.index).padStart(2, "0")}
        </span>
      </div>

      <h3 className="relative text-white font-semibold text-[14px] leading-tight mb-1">{step.title}</h3>
      <p className="relative text-slate-500 text-[11px] leading-snug mb-3">{step.short}</p>

      <div className="relative flex items-center justify-between">
        <WorkflowStatusBadge status={step.status} />
        <span
          className="text-[10px] font-medium inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: step.accent }}
        >
          Details
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </motion.button>
  );
}
