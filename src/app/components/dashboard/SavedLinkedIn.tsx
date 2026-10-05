"use client";

import { useState } from "react";
import Link from "next/link";
import { LinkedInProfileRow } from "@/app/components/dashboard/DashboardClient";

interface SavedLinkedInProps {
  profiles: LinkedInProfileRow[];
  formatRelative: (iso: string) => string;
  onDelete: (id: string) => Promise<void>;
}

const actionBtn =
  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90 border";

export default function SavedLinkedIn({ profiles, formatRelative, onDelete }: SavedLinkedInProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmId(null);
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-semibold text-white">Saved LinkedIn Optimizations</h2>
        <Link href="/linkedin-optimizer" className="text-xs font-medium transition-colors" style={{ color: "#93c5fd" }}>
          + New optimization
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(10,102,194,0.1)", border: "1px solid rgba(10,102,194,0.15)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
              <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No saved optimizations yet</p>
          <p className="text-xs text-slate-600 mb-3">Generate grounded LinkedIn copy, then save it here.</p>
          <Link href="/linkedin-optimizer" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90" style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.2)" }}>
            Optimize my profile
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {profiles.map((p) => {
            const title = (p.headline && p.headline.trim()) || "Saved LinkedIn profile";
            const skillCount = Array.isArray(p.skills) ? p.skills.length : 0;
            return (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.28)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                      <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{skillCount} {skillCount === 1 ? "skill" : "skills"}</span>
                      <span>·</span>
                      <span className="shrink-0">{formatRelative(p.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmId === p.id ? (
                      <>
                        <button type="button" onClick={() => setConfirmId(null)} className={actionBtn} style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", borderColor: "rgba(255,255,255,0.08)" }}>Cancel</button>
                        <button type="button" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className={actionBtn + " disabled:opacity-60"} style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.2)" }}>{deletingId === p.id ? "…" : "Confirm"}</button>
                      </>
                    ) : (
                      <>
                        <Link href={`/linkedin-optimizer?id=${p.id}`} className={actionBtn} style={{ background: "rgba(10,102,194,0.1)", color: "#93c5fd", borderColor: "rgba(10,102,194,0.2)" }}>View / Edit</Link>
                        <button type="button" onClick={() => setConfirmId(p.id)} className={actionBtn} style={{ background: "rgba(255,255,255,0.03)", color: "#64748b", borderColor: "rgba(255,255,255,0.07)" }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
