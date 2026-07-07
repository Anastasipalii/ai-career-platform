// ============================================================================
// AI Workflow module — domain types
// ----------------------------------------------------------------------------
// This module is the foundation for an orchestration layer that will later
// execute multi-step automations combining:
//   • AI agents (LLM tool-calling steps served by /api/* routes)
//   • n8n workflows (triggered via webhook / REST)
//   • Native automations (Supabase writes, notifications, schedules)
//
// Phase 1 is presentational only: it renders a catalog of workflow
// definitions. Nothing here executes yet. The types are intentionally broad
// so the execution engine (later phases) can be added additively without
// reshaping this contract.
// ============================================================================

// ── Taxonomy ────────────────────────────────────────────────────────────────

/** Broad grouping used for filtering and dashboards. */
export type WorkflowCategory =
  | "resume"
  | "job-search"
  | "outreach"
  | "interview"
  | "research"
  | "automation";

/** Lifecycle of a workflow definition (not of a run). */
export type WorkflowStatus = "available" | "beta" | "coming-soon";

/** How a workflow gets kicked off. Maps cleanly onto n8n trigger nodes. */
export type TriggerType = "manual" | "schedule" | "webhook" | "event";

/**
 * The kind of work a single step performs. Each kind will map to a concrete
 * executor in a later phase. Keeping this as a union (not a boolean flag)
 * lets us add executors — e.g. "vector-search", "email" — without breaking
 * existing definitions.
 */
export type StepKind =
  | "ai-agent" // LLM / tool-calling step (served by an internal /api route)
  | "n8n" // hand off to an n8n workflow via webhook
  | "http" // generic outbound HTTP request
  | "transform" // pure data mapping / shaping
  | "condition" // branch on previous output
  | "supabase" // read/write persisted user data
  | "notify"; // email / in-app notification

/** Status of a whole run. */
export type RunStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/** Status of an individual step within a run. */
export type StepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

// ── Definition (the "template") ──────────────────────────────────────────────

/** Visual accent so cards can echo the per-tool color language of the app. */
export interface WorkflowAccent {
  color: string; // solid accent, e.g. "#7c3aed"
  bg: string; // translucent fill, e.g. "rgba(124,58,237,0.1)"
  border: string; // translucent border, e.g. "rgba(124,58,237,0.2)"
}

/** How a workflow is triggered; `config` is trigger-specific and open-ended. */
export interface WorkflowTrigger {
  type: TriggerType;
  /**
   * Trigger-specific settings, resolved by the engine later:
   *   schedule → { cron: string }
   *   webhook  → { path: string }
   *   event    → { event: string }
   */
  config?: Record<string, unknown>;
}

/** A single node in the workflow graph. */
export interface WorkflowStepDef {
  id: string;
  name: string;
  kind: StepKind;
  description?: string;
  /**
   * Executor configuration, interpreted per `kind`:
   *   ai-agent → { route: string, model?: string, systemPrompt?: string }
   *   n8n      → { webhookUrl: string }
   *   http     → { method: string, url: string }
   * Left as an open record so new executors need no type surgery here.
   */
  config?: Record<string, unknown>;
  /** IDs of steps that must complete before this one runs (DAG edges). */
  dependsOn?: string[];
}

/** A reusable, versioned workflow template shown in the catalog. */
export interface WorkflowDefinition {
  id: string;
  /** URL-safe identifier, e.g. "tailored-application-kit". */
  slug: string;
  name: string;
  summary: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStepDef[];
  tags?: string[];
  accent?: WorkflowAccent;
  /** Rough runtime estimate for UX copy; not authoritative. */
  estimatedRuntimeSec?: number;
  /** Bumped when the definition changes; supports future migrations. */
  version?: number;
}

// ── Runtime (the "execution") ────────────────────────────────────────────────

/** Result of executing one step in a run. */
export interface WorkflowStepRun {
  stepId: string;
  status: StepStatus;
  startedAt?: string; // ISO timestamp
  finishedAt?: string; // ISO timestamp
  output?: unknown;
  error?: string;
}

/** One execution of a WorkflowDefinition. Persisted per user in a later phase. */
export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: RunStatus;
  triggeredBy: TriggerType;
  createdAt: string; // ISO timestamp
  finishedAt?: string; // ISO timestamp
  steps: WorkflowStepRun[];
  /** Set when the run originated from an authenticated session. */
  userId?: string;
}
