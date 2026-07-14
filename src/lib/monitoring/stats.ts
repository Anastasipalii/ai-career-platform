// ============================================================================
// monitoring/stats — pure aggregation & filtering for the admin dashboard
// ----------------------------------------------------------------------------
// No Supabase / network imports. Operates on already-fetched WorkflowRunRow[]
// (read via workflowRun.readAllWorkflowRunsAdmin) so it is fully unit-testable
// and the dashboard UI stays thin. This is a READ-ONLY monitoring concern — it
// never triggers OpenAI, job providers, or any generation.
// ============================================================================

import type { WorkflowRunRow, WorkflowStatus } from "@/lib/workflowRun";

export type SimulationFilter = "all" | "simulation" | "production";
export type StatusFilter = WorkflowStatus | "all";

export interface RunFilters {
  status: StatusFilter;
  simulation: SimulationFilter;
  profession: string; // "all" or an exact profession
  resumeLanguage: string; // "all" or an exact language
  fromDate: string | null; // "yyyy-mm-dd" inclusive (by created_at day)
  toDate: string | null; // "yyyy-mm-dd" inclusive
}

export const DEFAULT_FILTERS: RunFilters = {
  status: "all",
  simulation: "all",
  profession: "all",
  resumeLanguage: "all",
  fromDate: null,
  toDate: null,
};

export interface RunStats {
  total: number;
  running: number;
  queued: number;
  completed: number;
  failed: number;
  cancelled: number;
  successRatePct: number; // completed / terminal
  avgDurationMs: number; // mean duration_ms over completed runs that have one
  avgDurationSampleCount: number; // how many completed runs had a valid duration
  activeWorkers: number; // running count
  runsPerMinute: number; // runs created in the last 60s
}

/** The timestamp a run is bucketed by (created → started → completed). */
export function runTimestamp(r: WorkflowRunRow): string | null {
  return r.created_at ?? r.started_at ?? r.completed_at ?? null;
}

/** ISO → "yyyy-mm-dd" (UTC day). Returns "" for missing/invalid. */
function dayOf(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

/** Apply the dashboard filters to a set of runs. Pure. */
export function filterRuns(rows: WorkflowRunRow[], f: RunFilters): WorkflowRunRow[] {
  return rows.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.simulation === "simulation" && r.is_simulation !== true) return false;
    if (f.simulation === "production" && r.is_simulation === true) return false;
    if (f.profession !== "all" && (r.profession ?? "") !== f.profession) return false;
    if (f.resumeLanguage !== "all" && (r.resume_language ?? "") !== f.resumeLanguage) return false;
    if (f.fromDate || f.toDate) {
      const d = dayOf(runTimestamp(r));
      if (!d) return false;
      if (f.fromDate && d < f.fromDate) return false;
      if (f.toDate && d > f.toDate) return false;
    }
    return true;
  });
}

const isStatus = (r: WorkflowRunRow, s: WorkflowStatus) => r.status === s;

/** Compute the top-line statistics over a set of runs. `now` is injectable. */
export function computeRunStats(rows: WorkflowRunRow[], opts: { now?: number } = {}): RunStats {
  const now = opts.now ?? Date.now();
  const running = rows.filter((r) => isStatus(r, "running")).length;
  const queued = rows.filter((r) => isStatus(r, "queued")).length;
  const completed = rows.filter((r) => isStatus(r, "completed")).length;
  const failed = rows.filter((r) => isStatus(r, "failed")).length;
  const cancelled = rows.filter((r) => isStatus(r, "cancelled")).length;

  const terminal = completed + failed + cancelled;
  const successRatePct = terminal > 0 ? Math.round((completed / terminal) * 100) : 0;

  const durations = rows
    .filter((r) => isStatus(r, "completed") && typeof r.duration_ms === "number" && r.duration_ms! > 0)
    .map((r) => r.duration_ms as number);
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const avgDurationSampleCount = durations.length;

  const runsPerMinute = rows.filter((r) => {
    const iso = runTimestamp(r);
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && now - t <= 60_000 && now - t >= 0;
  }).length;

  return {
    total: rows.length,
    running,
    queued,
    completed,
    failed,
    cancelled,
    successRatePct,
    avgDurationMs,
    avgDurationSampleCount,
    activeWorkers: running,
    runsPerMinute,
  };
}

/** Distinct, sorted non-empty values of a run field (for filter dropdowns). */
export function distinctValues(rows: WorkflowRunRow[], key: "profession" | "resume_language"): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = (r[key] ?? "").toString().trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Format a duration in ms as a compact human string. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}
