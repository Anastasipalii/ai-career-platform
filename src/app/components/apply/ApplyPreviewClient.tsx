"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, XCircle, CheckCircle2, Loader2, ExternalLink, Play, ArrowLeft, FlaskConical, Download, FileText,
} from "lucide-react";
import { readApplicationDraft } from "@/lib/application/applicationDraft";
import { evaluateReadiness, prepareApplicationPackage } from "@/lib/application/prepare";
import { runDryRun } from "@/lib/application/dryRun";
import {
  APPLICATION_STAGES,
  type ApplicationDraft,
  type ApplicationPackage,
  type ApplicationStage,
  type DryRunResult,
} from "@/lib/application/types";
import {
  newApplicationRunKey, createApplicationRun, recordApplicationStage, completeApplicationRun, failApplicationRun,
  type ApplicationRunRow,
} from "@/lib/application/applicationRun";
import { downloadApplicationPackage, downloadDryRunReport } from "@/lib/application/download";

type Phase = "loading" | "no-draft" | "preview" | "running" | "final";
const ACCENT = "linear-gradient(135deg, #7c3aed, #06b6d4)";

const STAGE_LABEL: Record<ApplicationStage, string> = {
  application_started: "Application started",
  documents_validated: "Documents validated",
  candidate_data_prepared: "Candidate data prepared",
  application_payload_created: "Application payload created",
  safety_check_completed: "Safety check completed",
  dry_run_completed: "Dry run completed",
};

export default function ApplyPreviewClient() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [aiPkg, setAiPkg] = useState<ApplicationPackage | null>(null);
  const [stageState, setStageState] = useState<Record<string, "pending" | "active" | "done">>({});
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [runKey, setRunKey] = useState<string>("");
  const [pkgState, setPkgState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [reportState, setReportState] = useState<"idle" | "working" | "done" | "error">("idle");

  // Load the draft (client-only) without a synchronous setState-in-effect.
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const d = readApplicationDraft();
      setDraft(d);
      setPhase(d ? "preview" : "no-draft");
    });
    return () => { active = false; };
  }, []);

  const readiness = useMemo(() => evaluateReadiness(draft), [draft]);
  const deterministic = useMemo(() => prepareApplicationPackage(draft), [draft]);
  const pkg = aiPkg ?? deterministic;

  // Best-effort AI enrichment (our own internal route); always falls back.
  useEffect(() => {
    if (!draft) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/application/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!active) return;
        if (res.ok) {
          const json = (await res.json()) as { package?: ApplicationPackage };
          if (json.package) setAiPkg(json.package);
        }
      } catch {
        /* deterministic fallback already in use */
      }
    })();
    return () => { active = false; };
  }, [draft]);

  const startDryRun = useCallback(async () => {
    if (!draft || busy || !readiness.ready) return;
    setBusy(true);
    setPhase("running");
    setStageState(Object.fromEntries(APPLICATION_STAGES.map((s) => [s, "pending"])));

    // Best-effort persistence (no session / missing table → silent no-op).
    const runKey = newApplicationRunKey();
    setRunKey(runKey);
    const created = await createApplicationRun({
      applicationRunKey: runKey,
      workflowRunId: draft.workflowRunId,
      jobId: draft.job.externalId,
      jobTitle: draft.job.title,
      company: draft.job.company,
      provider: draft.job.provider,
      externalUrl: draft.job.sourceUrl,
    });
    const runDbId = created.id;

    const res = await runDryRun({
      draft,
      applicationRunKey: runKey,
      stageDelayMs: 650,
      onStage: (e) => {
        setStageState((prev) => ({ ...prev, [e.stage]: e.status === "completed" ? "done" : "active" }));
        if (runDbId) {
          void recordApplicationStage({
            runId: runDbId,
            stage: e.stage,
            status: e.status,
            durationMs: e.durationMs,
            startedAt: e.status === "running" ? new Date(e.atMs).toISOString() : undefined,
            completedAt: e.status === "completed" ? new Date(e.atMs).toISOString() : undefined,
          });
        }
      },
    });

    if (runDbId) {
      if (res.ok) {
        await completeApplicationRun({ applicationRunKey: runKey, durationMs: res.durationMs, validationResult: res.validation });
      } else {
        await failApplicationRun({ applicationRunKey: runKey, currentStep: "documents_validated", validationResult: res.validation });
      }
    }

    setResult(res);
    setBusy(false);
    setPhase("final");
  }, [draft, busy, readiness.ready]);

  // A row synthesized from the finished dry run (identical shape to the DB row),
  // so the shared download helpers produce the same output as the Dashboard.
  const rowFromRun = useCallback((): ApplicationRunRow | null => {
    if (!draft || !result) return null;
    return {
      application_run_key: runKey || undefined,
      workflow_run_id: draft.workflowRunId ?? null,
      job_id: draft.job.externalId ?? null,
      job_title: draft.job.title,
      company: draft.job.company ?? null,
      provider: draft.job.provider ?? null,
      external_url: draft.job.sourceUrl ?? null,
      status: result.ok ? "completed" : "failed",
      current_step: result.ok ? "dry_run_completed" : "documents_validated",
      progress: result.ok ? 100 : 0,
      is_dry_run: true,
      validation_result: result.validation as unknown as Record<string, unknown>,
      started_at: result.startedAtIso,
      completed_at: result.completedAtIso,
      duration_ms: result.durationMs,
      created_at: result.startedAtIso,
    };
  }, [draft, result, runKey]);

  // Employer package (original résumé + cover-letter PDF) — reuses the shared
  // builder/ZIP. No AI regeneration, no network request.
  const handleDownloadPackage = useCallback(async () => {
    const row = rowFromRun();
    if (!row || pkgState === "working") return;
    setPkgState("working");
    await new Promise((r) => setTimeout(r, 0)); // let "Preparing…" paint
    try {
      downloadApplicationPackage(row);
      setPkgState("done");
    } catch {
      setPkgState("error");
    }
  }, [rowFromRun, pkgState]);

  // Separate technical dry-run report — never bundled with the employer package.
  const handleDownloadReport = useCallback(async () => {
    const row = rowFromRun();
    if (!row || reportState === "working") return;
    setReportState("working");
    await new Promise((r) => setTimeout(r, 0));
    try {
      const stages = (result?.stages ?? [])
        .filter((s) => s.status === "completed")
        .map((s) => ({ stage: s.stage as string, status: s.status as string, durationMs: s.durationMs }));
      downloadDryRunReport(row, { stages });
      setReportState("done");
    } catch {
      setReportState("error");
    }
  }, [rowFromRun, reportState, result]);

  // ── loading / no draft ──
  if (phase === "loading") {
    return <Shell><div className="flex items-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading application…</div></Shell>;
  }
  if (phase === "no-draft" || !draft) {
    return (
      <Shell>
        <Banner />
        <Card>
          <p className="text-slate-300 text-sm mb-4">No vacancy selected. Run the AI workflow, then choose a matched job and click <strong>Prepare Application</strong>.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: ACCENT }}>
            <ArrowLeft size={15} /> Back to Dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const job = draft.job;

  // ── running ──
  if (phase === "running") {
    const done = APPLICATION_STAGES.filter((s) => stageState[s] === "done").length;
    const pct = Math.round((done / APPLICATION_STAGES.length) * 100);
    return (
      <Shell>
        <Banner />
        <Card>
          <h2 className="text-lg font-semibold text-white mb-1">Preparing application package…</h2>
          <p className="text-xs text-slate-500 mb-5">Dry run in progress — nothing is being submitted.</p>
          <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden mb-5">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: ACCENT }} />
          </div>
          <ol className="space-y-2.5">
            {APPLICATION_STAGES.map((s) => {
              const st = stageState[s] ?? "pending";
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  {st === "done" ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : st === "active" ? <Loader2 size={16} className="text-cyan-400 animate-spin" />
                    : <span className="w-4 h-4 rounded-full border border-white/15" />}
                  <span className={st === "pending" ? "text-slate-500" : "text-slate-200"}>{STAGE_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      </Shell>
    );
  }

  // ── final ──
  if (phase === "final" && result) {
    return (
      <Shell>
        <Banner />
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="text-emerald-400" size={24} />
            <h2 className="text-lg font-semibold text-white">Application package prepared successfully</h2>
          </div>
          <p className="text-sm text-emerald-300 mb-1">Dry run completed.</p>
          <p className="text-sm font-semibold text-amber-300 mb-5">No real application was sent.</p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm mb-5">
            <Row label="Job" value={job.title} />
            <Row label="Company" value={job.company ?? "—"} />
            <Row label="Completed" value={new Date(result.completedAtIso).toLocaleString()} />
            <Row label="Validation" value={result.validation.valid ? "Passed" : "Failed"} valueClass={result.validation.valid ? "text-emerald-300" : "text-rose-300"} />
            <Row label="Included documents" value={`Résumé (${draft.resumeName ?? "provided"}), Cover letter`} />
            <Row label="Mode" value="Dry run · no submission" />
          </dl>

          {pkgState === "done" && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400 mb-3 -mt-2"><CheckCircle2 size={13} /> Package ready — check your downloads.</p>
          )}
          {pkgState === "error" && (
            <p className="text-xs text-rose-400 mb-3 -mt-2">Couldn’t build the package. Please try again.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleDownloadPackage()}
              disabled={pkgState === "working"}
              aria-label="Download application package"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              style={{ background: ACCENT }}
            >
              {pkgState === "working" ? <Loader2 size={15} className="animate-spin" /> : pkgState === "done" ? <CheckCircle2 size={15} /> : <Download size={15} />}
              {pkgState === "working" ? "Preparing…" : pkgState === "done" ? "Downloaded" : "Download Package"}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadReport()}
              disabled={reportState === "working"}
              aria-label="Download dry run report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/[0.04] transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {reportState === "working" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              {reportState === "working" ? "Preparing…" : reportState === "done" ? "Report downloaded" : "Download Dry Run Report"}
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/[0.04]">
              <ArrowLeft size={15} /> Back to Dashboard
            </Link>
            {job.sourceUrl && (
              <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 border border-white/10 hover:bg-white/[0.04]">
                <ExternalLink size={15} /> View original vacancy
              </a>
            )}
          </div>
        </Card>
      </Shell>
    );
  }

  // ── preview ──
  return (
    <Shell>
      <Banner />
      <h1 className="text-2xl font-bold text-white mb-1">Application Preview</h1>
      <p className="text-slate-400 text-sm mb-6">Review the prepared package below, then run a safe dry run. No application is ever submitted.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* details */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <SectionTitle>Vacancy</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Row label="Job title" value={job.title} />
              <Row label="Company" value={job.company ?? "—"} />
              <Row label="Location" value={job.location ?? "—"} />
              <Row label="Provider" value={job.provider ?? "—"} />
              <Row label="Employment type" value={job.employmentType ?? (job.jobTypes?.join(" / ") || "—")} />
              <Row label="Match score" value={`${Math.round(job.matchScore)}%`} />
              <Row
                label="External job URL"
                value={
                  job.sourceUrl ? (
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline break-all">{job.sourceUrl}</a>
                  ) : "—"
                }
              />
            </dl>
          </Card>

          <Card>
            <SectionTitle>Candidate package</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Row label="Selected resume" value={draft.resumeName ?? "—"} />
              <Row label="Target profession" value={draft.targetProfession ?? "—"} />
              <Row label="Candidate profession" value={draft.profession ?? "—"} />
              <Row label="Resume language" value={draft.resumeLanguage ?? "—"} />
              <Row label="ATS score" value={`${Math.round(draft.atsScore)}`} />
            </dl>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Cover letter preview</p>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3 max-h-40 overflow-auto text-xs text-slate-300 whitespace-pre-wrap">
                {draft.coverLetterPreview?.trim() || "No cover letter available."}
              </div>
            </div>
          </Card>
        </div>

        {/* readiness + actions */}
        <div className="space-y-5">
          <Card>
            <SectionTitle>Readiness checklist</SectionTitle>
            <ul className="space-y-2 text-sm">
              {pkg.packageChecklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  {c.done ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-rose-400" />}
                  <span className={c.done ? "text-slate-200" : "text-rose-300"}>{c.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-white/[0.07] text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Readiness</span>
                <span className="font-semibold text-white capitalize">{pkg.readinessStatus.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Confidence</span>
                <span className="font-semibold text-white">{pkg.confidenceScore}%</span>
              </div>
            </div>
            {pkg.validationWarnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-[11px] text-amber-300">
                {pkg.validationWarnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            )}
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => void startDryRun()}
              disabled={!readiness.ready || busy}
              aria-label="Run safe dry run"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              style={{ background: ACCENT }}
            >
              <Play size={15} /> Run Dry Run
            </button>
            {!readiness.ready && (
              <p className="mt-2 text-[11px] text-rose-300">Missing: {readiness.missingItems.join(", ")}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white">
                <ArrowLeft size={13} /> Dashboard
              </Link>
              {job.sourceUrl && (
                <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:underline ml-auto">
                  <ExternalLink size={13} /> View original vacancy
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

// ── presentational helpers ──
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: "rgba(10,10,16,0.6)" }}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">{children}</h3>;
}
function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-slate-200 ${valueClass ?? ""}`}>{value}</dd>
    </div>
  );
}
function Banner() {
  return (
    <div
      className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl border border-amber-500/30"
      style={{ background: "rgba(245,158,11,0.10)" }}
      role="status"
    >
      <FlaskConical size={18} className="text-amber-300 shrink-0" />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">Test mode · Dry run</span>
        <span className="text-xs text-amber-200/80">No real application will be sent.</span>
      </div>
      <ShieldCheck size={16} className="text-amber-300/70 ml-auto shrink-0" />
    </div>
  );
}
