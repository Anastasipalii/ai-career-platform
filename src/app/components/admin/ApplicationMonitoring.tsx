"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, ChevronRight, ChevronDown, FlaskConical, RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/formatRelative";
import { formatDuration } from "@/lib/monitoring/stats";
import {
  readAllApplicationRunsAdmin,
  readApplicationEventsForRun,
  type ApplicationRunRow,
  type ApplicationEventRow,
} from "@/lib/application/applicationRun";

// Admin-only "Dry-run applications" view for the Monitoring Dashboard. It reads
// ONLY application_runs / application_events (read-only, never deletes), and
// every row/timeline is mode = dry_run — nothing here was submitted anywhere.
// Rendered inside MonitoringClient's admin section, so access is already gated.
export default function ApplicationMonitoring() {
  const [rows, setRows] = useState<ApplicationRunRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<ApplicationEventRow[]>([]);
  const [timelineState, setTimelineState] = useState<"loading" | "loaded" | "empty">("loading");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await readAllApplicationRunsAdmin(500);
    setRows(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const r = await readAllApplicationRunsAdmin(500);
      if (active) setRows(r);
    });
    return () => { active = false; };
  }, []);

  const openTimeline = useCallback(
    async (row: ApplicationRunRow) => {
      const id = row.id;
      if (!id) return;
      if (selected === id) { setSelected(null); return; }
      setSelected(id);
      setTimelineState("loading");
      setEvents([]);
      const ev = await readApplicationEventsForRun(id);
      setEvents(ev);
      setTimelineState(ev.length ? "loaded" : "empty");
    },
    [selected]
  );

  const statusColor = (s: string | null | undefined) =>
    s === "completed" ? "#34d399" : s === "failed" ? "#fb7185" : s === "running" ? "#22d3ee" : "#94a3b8";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-amber-300" />
          <h2 className="text-sm font-semibold text-white">Dry-run applications</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wide">mode: dry_run</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh dry-run applications"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 border border-white/10 hover:bg-white/[0.04] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {rows === null ? (
        <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center gap-2 text-slate-400 text-sm" style={{ background: "rgba(10,10,16,0.6)" }}>
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] p-6 text-center text-sm text-slate-500" style={{ background: "rgba(10,10,16,0.6)" }}>
          No dry-run applications yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(10,10,16,0.6)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-white/[0.07]">
                  <th className="px-3 py-2.5"></th>
                  <th className="text-left px-3 py-2.5">Job</th>
                  <th className="text-left px-3 py-2.5">Company</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-left px-3 py-2.5">Stage</th>
                  <th className="text-left px-3 py-2.5">Duration</th>
                  <th className="text-left px-3 py-2.5">Started</th>
                  <th className="text-left px-3 py-2.5">Mode</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = selected === r.id;
                  return (
                    <Fragment key={r.id ?? r.application_run_key}>
                      <tr
                        onClick={() => void openTimeline(r)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                      >
                        <td className="px-3 py-2.5">{open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-500" />}</td>
                        <td className="px-3 py-2.5 text-slate-200">{r.job_title ?? "—"}</td>
                        <td className="px-3 py-2.5 text-slate-400">{r.company ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold capitalize" style={{ color: statusColor(r.status) }}>{r.status ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{r.current_step ?? "—"}</td>
                        <td className="px-3 py-2.5 text-slate-300">{formatDuration(r.duration_ms)}</td>
                        <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{r.started_at ? formatRelative(r.started_at) : "—"}</td>
                        <td className="px-3 py-2.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">dry_run</span></td>
                      </tr>
                      {open && (
                        <tr className="bg-black/20">
                          <td colSpan={8} className="px-5 py-4">
                            {timelineState === "loading" ? (
                              <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={15} /> Loading timeline…</div>
                            ) : timelineState === "empty" ? (
                              <div className="text-slate-500 text-sm">No events recorded for this dry run.</div>
                            ) : (
                              <ol className="relative border-l border-white/[0.1] ml-2">
                                {events.map((e) => {
                                  const c = statusColor(e.status);
                                  return (
                                    <li key={e.id} className="ml-4 pb-3 last:pb-0">
                                      <span className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-[#0a0a10]" style={{ background: c }} />
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                        <span className="text-sm font-semibold text-white">{e.stage ?? "—"}</span>
                                        <span className="text-xs font-medium" style={{ color: c }}>{e.status ?? "—"}</span>
                                        {typeof e.duration_ms === "number" && <span className="text-[11px] text-slate-500">{formatDuration(e.duration_ms)}</span>}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">dry_run</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                                        <span>started {e.started_at ? formatRelative(e.started_at) : (e.created_at ? formatRelative(e.created_at) : "—")}</span>
                                        <span>completed {e.completed_at ? formatRelative(e.completed_at) : "—"}</span>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
