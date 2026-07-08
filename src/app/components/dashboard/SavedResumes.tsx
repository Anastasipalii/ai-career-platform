"use client";

import { useState } from "react";
import Link from "next/link";
import { ResumeRow } from "@/app/components/dashboard/DashboardClient";

interface SavedResumesProps {
  resumes: ResumeRow[];
  formatRelative: (iso: string) => string;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
}

function AtsBar({ score }: { score: number }) {
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#7c3aed" : "#f59e0b";
  return (
    <div className="flex items-center gap-2 max-w-[160px]">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function SavedResumes({ resumes, formatRelative, onDelete, onRename }: SavedResumesProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [renameId, setRenameId]               = useState<string | null>(null);
  const [renameValue, setRenameValue]         = useState("");
  const [savingRename, setSavingRename]       = useState(false);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const startRename = (id: string, current: string) => {
    setRenameId(id);
    setRenameValue(current);
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setSavingRename(true);
    await onRename(id, renameValue);
    setSavingRename(false);
    setRenameId(null);
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Saved Resumes</h2>
        <Link
          href="/resume-builder"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          + New resume
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6l-4.5-4z" />
              <path d="M10.5 2V6H15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No resumes yet</p>
          <p className="text-xs text-slate-600 mb-3">Create your first AI-powered resume.</p>
          <Link
            href="/resume-builder"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            Build a resume
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1.5H3.5a1 1 0 00-1 1v11a1 1 0 001 1h9a1 1 0 001-1V5L9 1.5z" />
                  <path d="M9 1.5V5h3.5" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {renameId === resume.id ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(resume.id);
                        if (e.key === "Escape") setRenameId(null);
                      }}
                      className="flex-1 min-w-0 rounded-lg px-2.5 py-1 text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.4)" }}
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(resume.id)}
                      disabled={savingRename}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 disabled:opacity-60"
                      style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      {savingRename ? "…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenameId(null)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-white truncate mb-1">{resume.title}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>{resume.language}</span>
                  {resume.template_name && (
                    <>
                      <span>·</span>
                      <span>{resume.template_name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Updated {formatRelative(resume.updated_at)}</span>
                </div>
                {resume.ats_score !== null ? (
                  <>
                    <div className="text-[10px] text-slate-600 mb-1">ATS Score</div>
                    <AtsBar score={resume.ats_score} />
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600">ATS score not calculated</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {confirmDeleteId === resume.id ? (
                  /* Two-step delete confirmation */
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(resume.id)}
                      disabled={deletingId === resume.id}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      {deletingId === resume.id ? (
                        <svg className="animate-spin" width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <circle cx="5.5" cy="5.5" r="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                          <path d="M5.5 1.5a4 4 0 014 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : "Confirm"}
                    </button>
                  </>
                ) : (
                  /* Normal actions */
                  <>
                    <Link
                      href={`/resume-builder?id=${resume.id}`}
                      title="Open in the builder to edit and download PDF"
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90"
                      style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
                    >
                      Edit / PDF
                    </Link>
                    <button
                      type="button"
                      onClick={() => startRename(resume.id, resume.title)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.03)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.09)" }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(resume.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
