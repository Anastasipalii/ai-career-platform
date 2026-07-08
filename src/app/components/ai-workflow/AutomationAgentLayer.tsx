"use client";

// ============================================================================
// Automation & Agent Layer — the scalable architecture behind the workflow
// ----------------------------------------------------------------------------
// Presentational only. Explains how the visible pipeline maps onto a real
// agent + orchestration stack: AI agents do the reasoning, n8n orchestrates,
// Supabase persists, and the Dashboard reflects the result. No logic, no
// backend — a concise, premium architecture overview.
// ============================================================================

import { motion } from "framer-motion";
import {
  Sparkles, Gauge, Search, Mail, Mic, Workflow, Database, LayoutDashboard,
  MousePointerClick, Cpu, Server, ArrowRight, type LucideIcon,
} from "lucide-react";

type LayerKind = "agent" | "infra";

interface LayerNode {
  name: string;
  kind: LayerKind;
  icon: LucideIcon;
  accent: string;
  role: string;
  input: string;
  output: string;
}

const NODES: LayerNode[] = [
  {
    name: "Resume Analysis Agent",
    kind: "agent",
    icon: Sparkles,
    accent: "#22d3ee",
    role: "Reviews tone, impact, and clarity, then proposes stronger rewrites.",
    input: "Parsed resume + target role",
    output: "Rewrite suggestions, impact score",
  },
  {
    name: "ATS Optimization Agent",
    kind: "agent",
    icon: Gauge,
    accent: "#06b6d4",
    role: "Scores ATS compatibility and injects the keywords a role expects.",
    input: "Resume + job description",
    output: "Optimized resume, ATS score, keyword map",
  },
  {
    name: "Job Matching Agent",
    kind: "agent",
    icon: Search,
    accent: "#10b981",
    role: "Embeds and ranks live postings against the optimized profile.",
    input: "Profile + preferences",
    output: "Ranked shortlist with fit scores",
  },
  {
    name: "Cover Letter Agent",
    kind: "agent",
    icon: Mail,
    accent: "#f59e0b",
    role: "Adapts tone and narrative to each company and role.",
    input: "Profile + selected job",
    output: "Tailored cover-letter drafts",
  },
  {
    name: "Interview Coach Agent",
    kind: "agent",
    icon: Mic,
    accent: "#ec4899",
    role: "Generates questions, scores answers, and returns feedback.",
    input: "Role + candidate answers",
    output: "Question bank, feedback, readiness score",
  },
  {
    name: "n8n Orchestrator",
    kind: "infra",
    icon: Workflow,
    accent: "#a855f7",
    role: "Sequences agents, handles retries, triggers, and branching.",
    input: "Run trigger + agent outputs",
    output: "Coordinated multi-step run",
  },
  {
    name: "Supabase Storage",
    kind: "infra",
    icon: Database,
    accent: "#3ecf8e",
    role: "Persists every artifact per user as the source of truth.",
    input: "Structured agent results",
    output: "Saved records (resumes, letters, matches…)",
  },
  {
    name: "Dashboard Sync",
    kind: "infra",
    icon: LayoutDashboard,
    accent: "#a78bfa",
    role: "Streams saved records into the user's live workspace.",
    input: "Persisted records",
    output: "Real-time widgets & activity feed",
  },
];

// The high-level pipeline the eight nodes above collapse into.
const FLOW: { label: string; icon: LucideIcon; accent: string }[] = [
  { label: "User Action", icon: MousePointerClick, accent: "#94a3b8" },
  { label: "AI Agents", icon: Cpu, accent: "#22d3ee" },
  { label: "n8n Orchestration", icon: Workflow, accent: "#a855f7" },
  { label: "Supabase", icon: Server, accent: "#3ecf8e" },
  { label: "Dashboard", icon: LayoutDashboard, accent: "#a78bfa" },
];

export default function AutomationAgentLayer() {
  return (
    <section id="automation-layer" className="relative py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="max-w-2xl mb-9">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#a78bfa" }} />
            <span className="text-[11px] font-medium text-violet-300 tracking-wide uppercase">
              Architecture
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Automation &amp; <span className="gradient-text">Agent Layer</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            The pipeline you just ran is a thin surface over a scalable stack. Specialized AI
            agents do the reasoning, n8n orchestrates the run, Supabase persists every artifact,
            and the Dashboard reflects it — the same architecture whether it runs for one user or
            thousands.
          </p>
        </div>

        {/* Visual flow: User Action → AI Agents → n8n → Supabase → Dashboard */}
        <div
          className="rounded-2xl border p-4 sm:p-5 mb-8"
          style={{ background: "rgba(8,8,14,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {FLOW.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex flex-col sm:flex-row items-center gap-2 sm:flex-1">
                  <div
                    className="flex-1 w-full flex items-center gap-3 rounded-xl px-3.5 py-3 border"
                    style={{ background: "rgba(13,13,22,0.7)", borderColor: `${f.accent}33` }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${f.accent}1f`, color: f.accent, border: `1px solid ${f.accent}3d` }}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-slate-200 leading-tight">{f.label}</span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-slate-600 rotate-90 sm:rotate-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent + infrastructure cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {NODES.map((node, i) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.06, ease: "easeOut" }}
                className="rounded-2xl border p-4 flex flex-col"
                style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${node.accent}1a`, color: node.accent, border: `1px solid ${node.accent}33` }}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      color: node.kind === "agent" ? "#c4b5fd" : "#7dd3fc",
                      background: node.kind === "agent" ? "rgba(124,58,237,0.12)" : "rgba(6,182,212,0.12)",
                      border: `1px solid ${node.kind === "agent" ? "rgba(124,58,237,0.28)" : "rgba(6,182,212,0.28)"}`,
                    }}
                  >
                    {node.kind === "agent" ? "AI Agent" : "Infra"}
                  </span>
                </div>

                <h3 className="text-white font-semibold text-[13.5px] leading-tight mb-1.5">{node.name}</h3>
                <p className="text-slate-500 text-[11.5px] leading-snug mb-3.5">{node.role}</p>

                <div className="mt-auto flex flex-col gap-1.5">
                  <FlowMeta label="In" value={node.input} accent={node.accent} />
                  <FlowMeta label="Out" value={node.output} accent={node.accent} />
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-600 mt-6">
          Conceptual architecture · agents and orchestration shown for illustration.
        </p>
      </div>
    </section>
  );
}

/** Compact input/output row shared by every node card. */
function FlowMeta({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="shrink-0 mt-[1px] text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ color: accent, background: `${accent}14`, border: `1px solid ${accent}2e` }}
      >
        {label}
      </span>
      <span className="text-slate-400 text-[11px] leading-snug">{value}</span>
    </div>
  );
}
