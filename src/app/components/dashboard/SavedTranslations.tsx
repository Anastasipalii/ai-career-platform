"use client";

import { useState } from "react";
import Link from "next/link";
import { TranslationRow } from "@/app/components/dashboard/DashboardClient";

interface SavedTranslationsProps {
  translations: TranslationRow[];
  formatRelative: (iso: string) => string;
  onDelete: (id: string) => Promise<void>;
}

const actionBtn =
  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90 border";

export default function SavedTranslations({ translations, formatRelative, onDelete }: SavedTranslationsProps) {
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
        <h2 className="text-sm font-semibold text-white">Saved Translations</h2>
        <Link href="/resume-translation" className="text-xs font-medium transition-colors" style={{ color: "#34d399" }}>
          + New translation
        </Link>
      </div>

      {translations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h7M9 3v2c0 4-2 7-5 8M5 9c0 3 3 5 6 6" /><path d="M14 19l3-7 3 7M14.5 17.5h5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No translations yet</p>
          <p className="text-xs text-slate-600 mb-3">Translate your résumé into another language and save it here.</p>
          <Link href="/resume-translation" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
            Translate my résumé
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {translations.slice(0, 8).map((t) => (
            <div key={t.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.28)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h7M9 3v2c0 4-2 7-5 8" /><path d="M14 19l3-7 3 7" /></svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {t.source_language} <span className="text-slate-600">→</span> {t.target_language}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Updated {formatRelative(t.updated_at)}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {confirmId === t.id ? (
                  <>
                    <button type="button" onClick={() => setConfirmId(null)} className={actionBtn} style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", borderColor: "rgba(255,255,255,0.08)" }}>Cancel</button>
                    <button type="button" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className={actionBtn + " disabled:opacity-60"} style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.2)" }}>{deletingId === t.id ? "…" : "Confirm"}</button>
                  </>
                ) : (
                  <>
                    <Link href={`/resume-translation?id=${t.id}`} className={actionBtn} style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(16,185,129,0.2)" }}>View / Edit</Link>
                    <button type="button" onClick={() => setConfirmId(t.id)} className={actionBtn} style={{ background: "rgba(255,255,255,0.03)", color: "#64748b", borderColor: "rgba(255,255,255,0.07)" }}>Delete</button>
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
