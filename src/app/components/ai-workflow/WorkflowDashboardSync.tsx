"use client";

// ============================================================================
// WorkflowDashboardSync — the pipeline's final payoff
// ----------------------------------------------------------------------------
// When the run completes, the outputs "land" in the user's Dashboard. Each
// entity card fades in one after another (staggered Framer Motion) to mimic
// records syncing in real time. Reuses the shared DASHBOARD_TARGETS registry
// so the destinations stay in lock-step with the detail panel.
// ============================================================================

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  FileText, Mail, Search, Mic, ClipboardList, Check, type LucideIcon,
} from "lucide-react";
import { getAllDashboardTargets, type DashboardEntity } from "./dashboardTargets";

interface SyncMeta {
  /** Title tuned to match the requested wording. */
  title: string;
  icon: LucideIcon;
  detail: string;
}

// Per-entity presentation, keyed to the shared registry.
const SYNC_META: Record<DashboardEntity, SyncMeta> = {
  resume: {
    title: "Resume",
    icon: FileText,
    detail: "Optimized & ATS-scored",
  },
  cover_letter: {
    title: "Cover Letter",
    icon: Mail,
    detail: "Tailored to your target role",
  },
  job_match: {
    title: "Job Matches",
    icon: Search,
    detail: "Ranked by best fit",
  },
  interview_session: {
    title: "Interview Session",
    icon: Mic,
    detail: "Questions & feedback ready",
  },
  task: {
    title: "Tasks",
    icon: ClipboardList,
    detail: "Follow-ups scheduled",
  },
};

// Container staggers its children so cards appear one after another.
const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16, delayChildren: 0.12 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

interface WorkflowDashboardSyncProps {
  show: boolean;
}

export default function WorkflowDashboardSync({ show }: WorkflowDashboardSyncProps) {
  if (!show) return null;

  const targets = getAllDashboardTargets();

  return (
    <section
      id="dashboard-sync"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex w-9 h-9 shrink-0">
          <span
            className="absolute inset-0 rounded-xl animate-ping"
            style={{ background: "rgba(124,58,237,0.25)" }}
          />
          <span
            className="relative w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <Check size={18} strokeWidth={2} color="#a78bfa" />
          </span>
        </span>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight leading-tight">
            Synced to your <span className="gradient-text">Dashboard</span>
          </h3>
          <p className="text-slate-500 text-[12.5px]">
            Every output lands in your personal workspace
          </p>
        </div>
      </div>

      {/* Sequentially revealed entity cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {targets.map((t) => {
          const meta = SYNC_META[t.entity];
          const Icon = meta.icon;
          return (
            <motion.div
              key={t.entity}
              variants={item}
              className="relative rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                background: "rgba(13,13,22,0.6)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: t.accent.bg, color: t.accent.color, border: `1px solid ${t.accent.border}` }}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.28)" }}
                >
                  <Check size={10} strokeWidth={2.5} />
                  Synced
                </span>
              </div>
              <div>
                <p className="text-white font-semibold text-[13.5px] leading-tight">{meta.title}</p>
                <p className="text-slate-500 text-[11.5px] leading-snug mt-1">{meta.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA into the real dashboard */}
      <div className="mt-7 flex justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 26px rgba(124,58,237,0.35)" }}
        >
          Open your Dashboard
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
