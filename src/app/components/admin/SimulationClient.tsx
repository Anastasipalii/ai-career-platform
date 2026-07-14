"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert, ShieldCheck, Play, Square, RotateCcw, Loader2,
  Activity, CheckCircle2, XCircle, Ban, Clock, Users,
} from "lucide-react";
import { checkAdminAccess } from "@/lib/simulation/adminAccess";
import { SimulationBatchController, type BatchProgress } from "@/lib/simulation/batchController";
import { createSupabaseSimulationSink } from "@/lib/simulation/supabaseSink";
import {
  ALLOWED_TOTAL_RUNS, DEFAULT_TOTAL_RUNS,
  CONCURRENCY_MIN, CONCURRENCY_MAX, DEFAULT_CONCURRENCY,
  ALLOWED_FAILURE_RATES_PCT,
  DEFAULT_MIN_STAGE_DELAY_MS, DEFAULT_MAX_STAGE_DELAY_MS,
  STAGE_DELAY_FLOOR_MS, STAGE_DELAY_CEILING_MS,
} from "@/lib/simulation/config";

type Access = "checking" | "unauth" | "denied" | "admin";

const ACCENT = "linear-gradient(135deg, #7c3aed, #06b6d4)";
const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(Number.isFinite(n) ? n : lo)));
const fmtElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const IDLE: BatchProgress = {
  status: "idle", config: null, total: 0, queued: 0, running: 0, completed: 0,
  failed: 0, cancelled: 0, settled: 0, progressPct: 0, elapsedMs: 0,
  persistenceErrors: 0, error: null, notes: [], summary: null,
};

export default function SimulationClient() {
  const [access, setAccess] = useState<Access>("checking");

  // ── config form ──
  const [total, setTotal] = useState<number>(DEFAULT_TOTAL_RUNS);
  const [concurrency, setConcurrency] = useState<number>(DEFAULT_CONCURRENCY);
  const [failurePct, setFailurePct] = useState<number>(5); // UI default 5%
  const [minDelay, setMinDelay] = useState<number>(DEFAULT_MIN_STAGE_DELAY_MS);
  const [maxDelay, setMaxDelay] = useState<number>(DEFAULT_MAX_STAGE_DELAY_MS);
  const [seed, setSeed] = useState<number>(1);

  const [progress, setProgress] = useState<BatchProgress>(IDLE);

  // one controller for the lifetime of the page; a NEW sink is created per batch.
  const controllerRef = useRef<SimulationBatchController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new SimulationBatchController({
      makeSink: () => createSupabaseSimulationSink(),
    });
  }
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── access check on mount ──
  useEffect(() => {
    let mounted = true;
    checkAdminAccess()
      .then((a) => {
        if (!mounted) return;
        setAccess(!a.userId ? "unauth" : a.isAdmin ? "admin" : "denied");
      })
      .catch(() => mounted && setAccess("denied"));
    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const running = progress.status === "running";

  const start = useCallback(async () => {
    const controller = controllerRef.current!;
    if (controller.isRunning()) return; // double-click / double-start guard
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => setProgress(controller.getProgress()), 150);

    // Re-verify admin against the DB at start time — never trust the rendered UI.
    await controller.start(
      {
        totalRuns: total,
        concurrency,
        failureRatePct: failurePct,
        minStageDelayMs: minDelay,
        maxStageDelayMs: maxDelay,
        seed,
      },
      async () => (await checkAdminAccess()).isAdmin
    );

    if (pollRef.current) clearInterval(pollRef.current);
    setProgress(controller.getProgress());
  }, [total, concurrency, failurePct, minDelay, maxDelay, seed]);

  const cancel = useCallback(() => {
    controllerRef.current?.cancel();
    setProgress(controllerRef.current!.getProgress());
  }, []);

  const resetBatch = useCallback(() => {
    const c = controllerRef.current!;
    if (c.isRunning()) return;
    c.reset();
    setProgress(c.getProgress());
  }, []);

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
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="text-amber-400" size={22} />
            <h2 className="text-lg font-semibold text-white">Sign in required</h2>
          </div>
          <p className="text-slate-400 text-sm mb-5">You must be signed in as an administrator to access the load-test simulation.</p>
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
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="text-rose-400" size={22} />
            <h2 className="text-lg font-semibold text-white">Access denied</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Your account is not an administrator. This page and the simulation engine are restricted to users in the
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">app_admins</code> allow-list.
          </p>
        </Card>
      </Shell>
    );
  }

  // ── admin view ──
  return (
    <Shell>
      <div className="flex items-center gap-2.5 mb-1">
        <ShieldCheck className="text-emerald-400" size={20} />
        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">Administrator</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1.5">Controlled Load-Test Simulation</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">
        Starts a batch of synthetic pipeline runs (mode <code className="px-1 rounded bg-white/[0.06]">stress</code>) through the real
        stage sequence with artificial delays. No OpenAI, no job providers, no email, no applications — every run is marked
        <code className="mx-1 px-1 rounded bg-white/[0.06]">is_simulation</code> and persisted under your session.
      </p>

      {/* ── control panel ── */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Total simulated users">
            <select value={total} disabled={running} onChange={(e) => setTotal(Number(e.target.value))} className={selectCls}>
              {ALLOWED_TOTAL_RUNS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label={`Concurrency (${CONCURRENCY_MIN}–${CONCURRENCY_MAX})`}>
            <input type="number" min={CONCURRENCY_MIN} max={CONCURRENCY_MAX} value={concurrency} disabled={running}
              onChange={(e) => setConcurrency(clampNum(Number(e.target.value), CONCURRENCY_MIN, CONCURRENCY_MAX))} className={inputCls} />
          </Field>
          <Field label="Failure rate">
            <select value={failurePct} disabled={running} onChange={(e) => setFailurePct(Number(e.target.value))} className={selectCls}>
              {ALLOWED_FAILURE_RATES_PCT.map((n) => <option key={n} value={n}>{n}%</option>)}
            </select>
          </Field>
          <Field label="Min stage delay (ms)">
            <input type="number" min={STAGE_DELAY_FLOOR_MS} max={STAGE_DELAY_CEILING_MS} value={minDelay} disabled={running}
              onChange={(e) => setMinDelay(clampNum(Number(e.target.value), STAGE_DELAY_FLOOR_MS, STAGE_DELAY_CEILING_MS))} className={inputCls} />
          </Field>
          <Field label="Max stage delay (ms)">
            <input type="number" min={STAGE_DELAY_FLOOR_MS} max={STAGE_DELAY_CEILING_MS} value={maxDelay} disabled={running}
              onChange={(e) => setMaxDelay(clampNum(Number(e.target.value), STAGE_DELAY_FLOOR_MS, STAGE_DELAY_CEILING_MS))} className={inputCls} />
          </Field>
          <Field label="Seed">
            <input type="number" value={seed} disabled={running}
              onChange={(e) => setSeed(Math.floor(Number(e.target.value) || 0))} className={inputCls} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button type="button" onClick={start} disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            style={{ background: ACCENT }}>
            {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {running ? "Simulation running…" : "Start simulation"}
          </button>
          <button type="button" onClick={cancel} disabled={!running}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <Square size={15} /> Cancel
          </button>
          {(progress.status === "completed" || progress.status === "cancelled" || progress.status === "error") && (
            <button type="button" onClick={resetBatch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/[0.04] transition">
              <RotateCcw size={15} /> New batch
            </button>
          )}
        </div>

        {progress.notes.length > 0 && (
          <p className="mt-3 text-xs text-amber-300/90">Adjusted: {progress.notes.join(" · ")}</p>
        )}
      </Card>

      {/* ── live progress ── */}
      {progress.status !== "idle" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <StatusBadge status={progress.status} />
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Users size={14} /> {progress.running} active</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {fmtElapsed(progress.elapsedMs)}</span>
            </div>
          </div>

          {/* progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{progress.settled} / {progress.total} settled</span>
              <span>{progress.progressPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress.progressPct}%`, background: ACCENT }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat icon={<Users size={15} />} label="Requested" value={progress.total} tone="slate" />
            <Stat icon={<Clock size={15} />} label="Queued" value={progress.queued} tone="slate" />
            <Stat icon={<Activity size={15} />} label="Running" value={progress.running} tone="cyan" />
            <Stat icon={<CheckCircle2 size={15} />} label="Completed" value={progress.completed} tone="emerald" />
            <Stat icon={<XCircle size={15} />} label="Failed" value={progress.failed} tone="rose" />
            <Stat icon={<Ban size={15} />} label="Cancelled" value={progress.cancelled} tone="amber" />
          </div>

          {progress.persistenceErrors > 0 && (
            <p className="mt-4 text-xs text-amber-300">
              {progress.persistenceErrors} persistence write(s) reported an error and were counted — the batch continued (no fabricated success).
            </p>
          )}
          {progress.error && <p className="mt-4 text-sm text-rose-300">{progress.error}</p>}

          {progress.summary && progress.status !== "running" && (
            <div className="mt-5 pt-4 border-t border-white/[0.07]">
              <p className="text-sm font-semibold text-white mb-1">Batch summary</p>
              <p className="text-xs text-slate-400">
                {progress.summary.completed} completed · {progress.summary.failed} failed · {progress.summary.cancelled} cancelled ·
                wall-clock {fmtElapsed(progress.summary.wallClockMs)} · seed {progress.config?.seed}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                No OpenAI, job-provider, email, or application calls were made — every run was synthetic (is_simulation = true).
              </p>
            </div>
          )}
        </Card>
      )}
    </Shell>
  );
}

// ── small presentational helpers ──
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] p-6 mb-5" style={{ background: "rgba(10,10,16,0.6)" }}>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
const TONES: Record<string, string> = {
  slate: "#94a3b8", cyan: "#22d3ee", emerald: "#34d399", rose: "#fb7185", amber: "#fbbf24",
};
function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] px-3.5 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-1" style={{ color: TONES[tone] }}>
        {icon} {label}
      </div>
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
    </div>
  );
}
function StatusBadge({ status }: { status: BatchProgress["status"] }) {
  const map: Record<string, { text: string; color: string; bg: string }> = {
    idle: { text: "Idle", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    running: { text: "Running", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    completed: { text: "Completed", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    cancelled: { text: "Cancelled", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    error: { text: "Error", color: "#fb7185", bg: "rgba(251,113,133,0.12)" },
  };
  const s = map[status] ?? map.idle;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} /> {s.text}
    </span>
  );
}

const selectCls = "px-3 py-2 rounded-lg text-sm text-white bg-[#0d0d14] border border-white/10 focus:border-violet-500/50 outline-none disabled:opacity-50";
const inputCls = "px-3 py-2 rounded-lg text-sm text-white bg-[#0d0d14] border border-white/10 focus:border-violet-500/50 outline-none disabled:opacity-50";
