import Link from "next/link";
import { CoverLetterRow } from "@/app/components/dashboard/DashboardClient";

interface SavedCoverLettersProps {
  coverLetters: CoverLetterRow[];
  formatRelative: (iso: string) => string;
}

function companyColor(name: string): { color: string; bg: string } {
  const palette = [
    { color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    { color: "#67e8f9", bg: "rgba(103,232,249,0.1)" },
    { color: "#6ee7b7", bg: "rgba(110,231,183,0.1)" },
    { color: "#fcd34d", bg: "rgba(252,211,77,0.1)" },
    { color: "#f9a8d4", bg: "rgba(249,168,212,0.1)" },
  ];
  return palette[name.charCodeAt(0) % palette.length];
}

export default function SavedCoverLetters({ coverLetters, formatRelative }: SavedCoverLettersProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Saved Cover Letters</h2>
        <Link href="/cover-letter" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
          + New letter
        </Link>
      </div>

      {coverLetters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5h14v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
              <path d="M2 5l7 5 7-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No cover letters yet</p>
          <p className="text-xs text-slate-600 mb-3">Generate personalised cover letters in seconds.</p>
          <Link
            href="/cover-letter"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(6,182,212,0.12)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
          >
            Create a cover letter
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {coverLetters.map((letter) => {
            const { color, bg } = companyColor(letter.company_name);
            return (
              <div
                key={letter.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Company initial */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: bg, color, border: `1px solid ${color}33` }}
                >
                  {letter.company_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{letter.company_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="truncate">{letter.job_title}</span>
                    <span>·</span>
                    <span>{letter.language}</span>
                    <span>·</span>
                    <span className="shrink-0">{formatRelative(letter.updated_at)}</span>
                  </div>
                </div>

                {/* Action */}
                <Link
                  href="/cover-letter"
                  className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90"
                  style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
                >
                  Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
