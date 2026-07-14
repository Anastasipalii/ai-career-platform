"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert, ShieldCheck, RefreshCw, Loader2, AlertTriangle, Inbox,
  Activity, CheckCircle2, XCircle, Ban, Clock, Gauge, TrendingUp, ChevronRight, ChevronDown,
} from "lucide-react";
import { checkAdminAccess } from "@/lib/simulation/adminAccess";
import {
  readAllWorkflowRunsAdminResult,
  readWorkflowEventsForRun,
  type WorkflowRunRow,
  type WorkflowEventRow,
} from "@/lib/workflowRun";
import { WORKFLOW_STATUSES } from "@/lib/workflow/stages";
import { formatRelative } from "@/lib/formatRelative";
import {
  DEFAULT_FILTERS, filterRuns, computeRunStats, distinctValues, formatDuration,
  type RunFilters,
} from "@/lib/monitoring/stats";
import { PollingController } from "@/lib/monitoring/polling";
import { runRefresh } from "@/lib/monitoring/refresh";

// Dev-only diagnostics (no sensitive data — lifecycle events only).
const diag = (event: string) => {
  if (process.env.NODE_ENV !== "production") console.log("[monitoring]", event);
};

type Access = "checking" | "unauth" | "denied" | "admin";
type LoadState = "idle" | "loading" | "loaded" | "error";
type TimelineState = "loading" | "loaded" | "empty" | "error";

const LOAD_LIMIT = 500;
const ACCENT = "linear-gradient(135deg, #7c3aed, #06b6d4)";
const runId = (r: WorkflowRunRow): string => r.id ?? r.run_key ?? "";
const shortId = (r: WorkflowRunRow): string => (r.run_key ?? r.id ?? "—").slice(0, 8);
const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? formatRelative(iso) : "—";
};

export default function MonitoringClient() {
  const [access, setAccess] = useState<Access>("checking");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<WorkflowRunRow[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  // Busy flag drives the button/spinner. It is ALWAYS reset (runRefresh's
  // finally), so the button can never get stuck disabled. `refreshError` is a
  // small, dismissible message shown while the prior rows are preserved.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [timelineState, setTimelineState] = useState<TimelineState>("loading");
  const [timelineEvents, setTimelineEvents] = useState<WorkflowEventRow[]>([]);
  const fetchingRef = useRef(false);

  const load = useCallback(
    () =>
      runRefresh<WorkflowRunRow>({
        inFlight: fetchingRef,
        fetcher: () => readAllWorkflowRunsAdminResult({ limit: LOAD_LIMIT }),
        onStart: () => {
          setRefreshing(true);
          setRefreshError(null);
          // Big table loader only on the very first load; a refresh keeps the
          // table visible and shows the button spinner instead.
          setLoadState((s) => (s === "loaded" ? "loaded" : "loading"));
        },
        onRows: (data) => {
          setRows(data);
          setLoadState("loaded");
        },
        onError: (message) => {
          // Preserve existing rows + show an inline message. The big error card
          // is used only when nothing has loaded yet.
          setRefreshError(message);
          setLoadState((s) => (s === "loaded" ? "loaded" : "error"));
        },
        onRefreshedAt: (ms) => setLastRefreshed(ms),
        onSettled: () => setRefreshing(false),
        diag,
      }),
    []
  );

  // access check + initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const a = await checkAdminAccess().catch(() => ({ userId: null, isAdmin: false }));
      if (!mounted) return;
      if (!a.userId) return setAccess("unauth");
      if (!a.isAdmin) return setAccess("denied");
      setAccess("admin");
      await load();
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  // optional polling (Refresh alternative to Realtime). On enable: run an
  // immediate refresh, then start exactly one 5s interval. Cleanup stops the
  // interval on disable/unmount. Filters and expanded rows are untouched.
  useEffect(() => {
    if (access !== "admin" || !autoRefresh) return;
    diag("autorefresh:enabled");
    void load(); // immediate refresh so the user sees it working at once
    const poller = new PollingController(5000, () => void load());
    poller.start();
    return () => {
      poller.stop();
      diag("autorefresh:disabled");
    };
  }, [access, autoRefresh, load]);

  const openTimeline = useCallback(
    async (r: WorkflowRunRow) => {
      const id = runId(r);
      if (!id) return;
      if (selectedRunId === id) {
        setSelectedRunId(null);
        return;
      }
      setSelectedRunId(id);
      setTimelineState("loading");
      setTimelineEvents([]);
      try {
        const ev = await readWorkflowEventsForRun(id);
        setTimelineEvents(ev);
        setTimelineState(ev.length ? "loaded" : "empty");
      } catch {
        setTimelineState("error");
      }
    },
    [selectedRunId]
  );

  const filtered = useMemo(() => filterRuns(rows, filters), [rows, filters]);
  const stats = useMemo(() => computeRunStats(filtered), [filtered]);
  const professions = useMemo(() => distinctValues(rows, "profession"), [rows]);
  const languages = useMemo(() => distinctValues(rows, "resume_language"), [rows]);
  const setF = <K extends keyof RunFilters>(k: K, v: RunFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  // ── access states ──
  if (access === "checking") {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={18} /> Verifying administrator access…
        </div>
      </Shell>
    );
  }
  if (access === "unauth") {
    return (
      <Shell>
        <Card>
          <Head icon={<ShieldAlert className="text-amber-400" size={22} />} title="Sign in required" />
          <p className="text-slate-400 text-sm mb-5">You must be signed in as an administrator to view pipeline monitoring.</p>
          <Link href="/login" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: ACCENT }}>
            Go to sign in
          </Link>
        </Card>
      </Shell>
    );
  }
  if (access === "denied") {
    return (
      <Shell>
        <Card>
          <Head icon={<ShieldAlert className="text-rose-400" size={22} />} title="Access denied" />
          <p className="text-slate-400 text-sm">
            Your account is not an administrator. Monitoring is restricted to users in the
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">app_admins</code> allow-list.
          </p>
        </Card>
      </Shell>
    );
  }

  // ── admin view ──
  return (
    <Shell>
      <div className="flex items-center justify-between gap-4 mb-1.5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="text-emerald-400" size={20} />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">Administrator</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-violet-500" />
            Auto-refresh (5s)
            {autoRefresh && (
              <span className="inline-flex items-center gap-1 text-emerald-400" aria-live="polite">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> on
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => {
              diag("refresh:click");
              void load();
            }}
            disabled={refreshing}
            aria-label="Refresh monitoring data"
            aria-busy={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a10]"
            style={{ background: ACCENT }}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {refreshError && (
        <div
          role="alert"
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs text-rose-200 border border-rose-500/30 bg-rose-500/10"
        >
          <AlertTriangle size={14} className="shrink-0" /> {refreshError}
        </div>
      )}
      <h1 className="text-2xl font-bold text-white mb-1">Pipeline Monitoring</h1>
      <p className="text-slate-400 text-sm mb-1">
        Read-only view of <code className="px-1 rounded bg-white/[0.06]">workflow_runs</code> and{" "}
        <code className="px-1 rounded bg-white/[0.06]">workflow_events</code>. No AI, provider, or generation calls are made.
      </p>
      <p className="text-xs text-slate-500 mb-6">
        Statistics are based on the latest {LOAD_LIMIT} loaded runs matching the current filters
        {lastRefreshed ? ` · updated ${fmtTime(new Date(lastRefreshed).toISOString())}` : ""}.
      </p>

      {/* ── stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <Stat icon={<Activity size={15} />} label="Total runs" value={stats.total} tone="slate" />
        <Stat icon={<Clock size={15} />} label="Queued" value={stats.queued} tone="slate" />
        <Stat icon={<Activity size={15} />} label="Running" value={stats.running} tone="cyan" />
        <Stat icon={<CheckCircle2 size={15} />} label="Completed" value={stats.completed} tone="emerald" />
        <Stat icon={<XCircle size={15} />} label="Failed" value={stats.failed} tone="rose" />
        <Stat icon={<Ban size={15} />} label="Cancelled" value={stats.cancelled} tone="amber" />
        <Stat icon={<Gauge size={15} />} label="Success rate" value={`${stats.successRatePct}%`} tone="emerald" />
        <Stat icon={<Clock size={15} />} label="Avg duration" value={stats.avgDurationSampleCount > 0 ? formatDuration(stats.avgDurationMs) : "—"} tone="slate" />
        <Stat icon={<Activity size={15} />} label="Active runs" value={stats.activeWorkers} tone="cyan" />
        <Stat icon={<TrendingUp size={15} />} label="Runs / min" value={stats.runsPerMinute} tone="violet" />
      </div>

      {/* ── filters ── */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Status">
            <select value={filters.status} onChange={(e) => setF("status", e.target.value as RunFilters["status"])} className={selectCls}>
              <option value="all">All</option>
              {WORKFLOW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={filters.simulation} onChange={(e) => setF("simulation", e.target.value as RunFilters["simulation"])} className={selectCls}>
              <option value="all">All</option>
              <option value="simulation">Simulation</option>
              <option value="production">Production</option>
            </select>
          </Field>
          <Field label="Profession">
            <select value={filters.profession} onChange={(e) => setF("profession", e.target.value)} className={selectCls}>
              <option value="all">All</option>
              {professions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Resume language">
            <select value={filters.resumeLanguage} onChange={(e) => setF("resumeLanguage", e.target.value)} className={selectCls}>
              <option value="all">All</option>
              {languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Date range">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <input type="date" value={filters.fromDate ?? ""} onChange={(e) => setF("fromDate", e.target.value || null)} className={selectCls + " flex-1 min-w-0 basis-28"} />
              <span className="text-slate-600 text-xs shrink-0">→</span>
              <input type="date" value={filters.toDate ?? ""} onChange={(e) => setF("toDate", e.target.value || null)} className={selectCls + " flex-1 min-w-0 basis-28"} />
            </div>
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{filtered.length} of {rows.length} loaded runs match</span>
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-slate-400 hover:text-white underline underline-offset-2">
            Clear filters
          </button>
        </div>
      </Card>

      {/* ── table / states ── */}
      {loadState === "loading" && rows.length === 0 ? (
        <Card><div className="flex items-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading runs…</div></Card>
      ) : loadState === "error" ? (
        <Card>
          <div className="flex items-center gap-2.5 text-rose-300">
            <AlertTriangle size={18} /> Failed to load runs. <button type="button" onClick={() => void load()} className="underline">Retry</button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
            <Inbox size={26} />
            <p className="text-sm">{rows.length === 0 ? "No workflow runs found yet." : "No runs match the current filters."}</p>
          </div>
        </Card>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(10,10,16,0.6)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-white/[0.07]">
                  <Th></Th><Th>Run ID</Th><Th>Status</Th><Th>Stage</Th><Th>Progress</Th><Th>Profession</Th>
                  <Th>Lang</Th><Th>Jobs</Th><Th>Retries</Th><Th>Duration</Th><Th>Started</Th><Th>Completed</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const id = runId(r);
                  const open = selectedRunId === id;
                  return (
                    <RowGroup
                      key={id || `row-${i}`}
                      run={r}
                      open={open}
                      onToggle={() => void openTimeline(r)}
                      timelineState={timelineState}
                      events={timelineEvents}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── a run row plus its (conditionally rendered) timeline row ──
function RowGroup({
  run, open, onToggle, timelineState, events,
}: {
  run: WorkflowRunRow; open: boolean; onToggle: () => void;
  timelineState: TimelineState; events: WorkflowEventRow[];
}) {
  const progress = typeof run.progress === "number" ? run.progress : 0;
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
      >
        <Td>{open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-500" />}</Td>
        <Td>
          <span className="font-mono text-xs text-slate-300" title={run.run_key ?? run.id ?? ""}>{shortId(run)}</span>
          {run.is_simulation ? <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">sim</span> : null}
        </Td>
        <Td><StatusBadge status={run.status ?? "—"} /></Td>
        <Td><span className="text-slate-300">{run.current_step ?? "—"}</span></Td>
        <Td>
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="h-1.5 w-14 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: ACCENT }} />
            </div>
            <span className="text-xs text-slate-400 tabular-nums">{progress}%</span>
          </div>
        </Td>
        <Td><span className="text-slate-300">{run.profession ?? "—"}</span></Td>
        <Td><span className="text-slate-400">{run.resume_language ?? "—"}</span></Td>
        <Td><span className="text-slate-300 tabular-nums">{run.jobs_found ?? "—"}</span></Td>
        <Td><span className="text-slate-400 tabular-nums">{run.retry_count ?? 0}</span></Td>
        <Td><span className="text-slate-300">{formatDuration(run.duration_ms)}</span></Td>
        <Td><span className="text-slate-400 whitespace-nowrap">{run.started_at ? formatRelative(run.started_at) : "—"}</span></Td>
        <Td><span className="text-slate-400 whitespace-nowrap">{run.completed_at ? formatRelative(run.completed_at) : "—"}</span></Td>
      </tr>
      {open && (
        <tr className="bg-black/20">
          <td colSpan={12} className="px-5 py-4">
            <Timeline state={timelineState} events={events} run={run} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── chronological event timeline for a run ──
function Timeline({ state, events, run }: { state: TimelineState; events: WorkflowEventRow[]; run: WorkflowRunRow }) {
  if (state === "loading") return <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={15} /> Loading timeline…</div>;
  if (state === "error") return <div className="flex items-center gap-2 text-rose-300 text-sm"><AlertTriangle size={15} /> Failed to load the event timeline.</div>;
  if (state === "empty") return <div className="text-slate-500 text-sm">No events recorded for this run.</div>;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Event timeline · {events.length} event{events.length === 1 ? "" : "s"}
        <span className="ml-2 font-mono normal-case text-slate-500">{run.run_key ?? run.id}</span>
      </p>
      <ol className="relative border-l border-white/[0.1] ml-2">
        {events.map((e) => {
          const c = statusColor(e.status);
          return (
            <li key={e.id} className="ml-4 pb-4 last:pb-0">
              <span className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-[#0a0a10]" style={{ background: c }} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-white">{e.step ?? "—"}</span>
                <span className="text-xs font-medium" style={{ color: c }}>{e.status ?? "—"}</span>
                {typeof e.progress === "number" && <span className="text-[11px] text-slate-500">{e.progress}%</span>}
                {typeof e.duration_ms === "number" && <span className="text-[11px] text-slate-500">{formatDuration(e.duration_ms)}</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                <span>started {e.started_at ? formatRelative(e.started_at) : (e.created_at ? formatRelative(e.created_at) : "—")}</span>
                <span>completed {e.completed_at ? formatRelative(e.completed_at) : "—"}</span>
              </div>
              {(e.error_code || e.error_message) && (
                <div className="mt-1 text-[11px] text-rose-300">
                  {e.error_code ? <span className="font-mono">{e.error_code}</span> : null}
                  {e.error_message ? <span className="ml-1.5">{e.error_message}</span> : null}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── presentational helpers ──
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.07] p-6 mb-5" style={{ background: "rgba(10,10,16,0.6)" }}>{children}</div>;
}
function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-3 mb-3">{icon}<h2 className="text-lg font-semibold text-white">{title}</h2></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
const TONES: Record<string, string> = { slate: "#94a3b8", cyan: "#22d3ee", emerald: "#34d399", rose: "#fb7185", amber: "#fbbf24", violet: "#a78bfa" };
function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] px-3.5 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-1" style={{ color: TONES[tone] }}>{icon} {label}</div>
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
    </div>
  );
}
function statusColor(status: string | null): string {
  switch (status) {
    case "running": return "#22d3ee";
    case "completed": return "#34d399";
    case "failed": return "#fb7185";
    case "cancelled": return "#fbbf24";
    case "queued": return "#94a3b8";
    default: return "#94a3b8";
  }
}
function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ color: c, background: `${c}22` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} /> {status}
    </span>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2.5 whitespace-nowrap">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5 align-middle">{children}</td>;
}

const selectCls = "w-full min-w-0 px-3 py-2 rounded-lg text-sm text-white bg-[#0d0d14] border border-white/10 focus:border-violet-500/50 outline-none";
