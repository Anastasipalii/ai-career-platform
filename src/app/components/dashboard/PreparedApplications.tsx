"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Download, FileText, Eye, ExternalLink, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatRelative } from "@/lib/formatRelative";
import { readRecentApplicationRuns, type ApplicationRunRow } from "@/lib/application/applicationRun";
import { saveApplicationDraft } from "@/lib/application/applicationDraft";
import { draftFromRow } from "@/lib/application/package";
import { downloadApplicationPackage, downloadDryRunReport, enrichmentForRow } from "@/lib/application/download";

type DownloadState = "idle" | "working" | "done" | "error";
const ACCENT = "linear-gradient(135deg, #7c3aed, #06b6d4)";

export default function PreparedApplications() {
  const router = useRouter();
  const [rows, setRows] = useState<ApplicationRunRow[] | null>(null);
  const [dl, setDl] = useState<Record<string, DownloadState>>({});
  const [rep, setRep] = useState<Record<string, DownloadState>>({});

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const r = await readRecentApplicationRuns(10);
      if (active) setRows(r);
    });
    return () => { active = false; };
  }, []);

  if (!rows || rows.length === 0) return null;

  const keyOf = (r: ApplicationRunRow) => r.id ?? r.application_run_key ?? "";
  const setState = (id: string, s: DownloadState) => setDl((p) => ({ ...p, [id]: s }));

  const handleDownload = async (row: ApplicationRunRow) => {
    const id = keyOf(row);
    if (dl[id] === "working") return; // guard double-click
    setState(id, "working");
    // Let React paint "Preparing…" before the (synchronous) zip build.
    await new Promise((r) => setTimeout(r, 0));
    try {
      // Prepared entirely from existing generated data — never re-runs anything.
      downloadApplicationPackage(row);
      setState(id, "done"); // persistent success feedback (package ready)
    } catch {
      setState(id, "error");
    }
  };

  const handleReport = async (row: ApplicationRunRow) => {
    const id = keyOf(row);
    if (rep[id] === "working") return;
    setRep((p) => ({ ...p, [id]: "working" }));
    await new Promise((r) => setTimeout(r, 0));
    try {
      downloadDryRunReport(row); // separate technical PDF — never mixed into the package
      setRep((p) => ({ ...p, [id]: "done" }));
    } catch {
      setRep((p) => ({ ...p, [id]: "error" }));
    }
  };

  const handleOpenPreview = (row: ApplicationRunRow) => {
    saveApplicationDraft(draftFromRow(row, enrichmentForRow(row)));
    router.push("/apply/preview");
  };

  const statusColor = (s: string | null | undefined) =>
    s === "completed" ? "#34d399" : s === "failed" ? "#fb7185" : s === "running" ? "#22d3ee" : "#94a3b8";

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "rgba(13,13,22,0.6)" }}>
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical size={16} className="text-amber-300" />
        <h3 className="text-white font-semibold text-sm">Prepared Applications</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wide">Dry run</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => {
          const id = keyOf(r);
          const st = dl[id] ?? "idle";
          return (
            <div
              key={id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* header */}
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[13px] font-semibold truncate">{r.job_title ?? "Application"}</p>
                  <p className="text-slate-500 text-[11px] truncate">{r.company ?? "—"}</p>
                </div>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">Dry Run</span>
              </div>

              {/* meta */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-semibold capitalize" style={{ color: statusColor(r.status) }}>{r.status ?? "—"}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{r.created_at ? formatRelative(r.created_at) : "—"}</span>
                {st === "done" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 size={12} /> Package ready
                  </span>
                )}
                {st === "error" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-rose-400 font-medium">
                    <AlertTriangle size={12} /> Couldn’t build
                  </span>
                )}
              </div>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleDownload(r)}
                  disabled={st === "working"}
                  aria-label="Download application package"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold text-white transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  style={{ background: ACCENT }}
                >
                  {st === "working" ? <Loader2 size={13} className="animate-spin" /> : st === "done" ? <CheckCircle2 size={13} /> : <Download size={13} />}
                  {st === "working" ? "Preparing…" : st === "done" ? "Downloaded" : "Download Package"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleReport(r)}
                  disabled={rep[id] === "working"}
                  aria-label="Download dry run report"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-slate-200 border border-white/10 hover:bg-white/[0.04] transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  {rep[id] === "working" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {rep[id] === "working" ? "Preparing…" : rep[id] === "done" ? "Report ✓" : "Dry Run Report"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPreview(r)}
                  aria-label="Open application preview"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-slate-200 border border-white/10 hover:bg-white/[0.04] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <Eye size={13} /> Open Preview
                </button>

                {r.external_url && (
                  <a
                    href={r.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-cyan-300 hover:underline ml-auto"
                  >
                    <ExternalLink size={13} /> View Original Vacancy
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
