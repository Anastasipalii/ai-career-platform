import Link from "next/link";
import { InterviewRow } from "@/app/components/dashboard/DashboardClient";

interface InterviewWidgetProps {
  sessions: InterviewRow[];
  formatRelative: (iso: string) => string;
}

function scoreColor(n: number) {
  if (n >= 85) return "#10b981";
  if (n >= 70) return "#f59e0b";
  return "#ef4444";
}

export default function InterviewWidget({ sessions, formatRelative }: InterviewWidgetProps) {
  const recent = sessions.slice(0, 3);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Interview Practice</h2>
        <Link href="/interview-coach" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
          Practice now →
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5.5" y="2" width="7" height="9" rx="3.5" />
              <path d="M3 10.5a6 6 0 0012 0" />
              <line x1="9" y1="16.5" x2="9" y2="14" />
              <line x1="6.5" y1="16.5" x2="11.5" y2="16.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No practice sessions yet</p>
          <p className="text-xs text-slate-600 mb-3">Practise answers, get AI feedback and improve your score.</p>
          <Link
            href="/interview-coach"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            Start practising
          </Link>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {recent.map((s) => {
            const sc = s.score !== null ? scoreColor(s.score) : "#475569";
            return (
              <div
                key={s.id}
                className="rounded-xl p-4 border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.interview_type}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {s.job_title ?? "General"} · {formatRelative(s.created_at)}
                    </p>
                  </div>
                  {s.score !== null && (
                    <div
                      className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5 shrink-0"
                      style={{ background: `${sc}15`, border: `1px solid ${sc}44` }}
                    >
                      <span className="text-base font-bold leading-none" style={{ color: sc }}>{s.score}</span>
                      <span className="text-[9px] font-medium mt-0.5" style={{ color: sc, opacity: 0.7 }}>/100</span>
                    </div>
                  )}
                </div>
                {s.score !== null && (
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: sc }} />
                  </div>
                )}
              </div>
            );
          })}

          <Link
            href="/interview-coach"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            Start new practice session
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
