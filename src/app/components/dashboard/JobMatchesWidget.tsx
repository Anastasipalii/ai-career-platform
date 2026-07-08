import Link from "next/link";
import { JobMatchRow } from "@/app/components/dashboard/DashboardClient";

interface JobMatchesWidgetProps {
  matches: JobMatchRow[];
  formatRelative: (iso: string) => string;
}

function scoreColor(n: number) {
  if (n >= 90) return "#10b981";
  if (n >= 75) return "#8b5cf6";
  return "#06b6d4";
}

export default function JobMatchesWidget({ matches, formatRelative }: JobMatchesWidgetProps) {
  const top = matches.slice(0, 8);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">AI-Recommended Roles</h2>
        <Link href="/job-match" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
          {matches.length > 0 ? `See all ${matches.length} →` : "Find matches →"}
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6" />
              <path d="M13 13l3.5 3.5" strokeWidth="1.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No job matches yet</p>
          <p className="text-xs text-slate-600 mb-3">Find roles where your profile has the highest fit.</p>
          <Link
            href="/job-match"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            Find matching jobs
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {top.map((match) => {
            const sc = scoreColor(match.match_score ?? 0);
            const strengths = (match.matchedStrengths ?? []).slice(0, 3);
            const missing = (match.missingSkills ?? []).slice(0, 3);
            const learn = (match.recommendedSkills ?? []).slice(0, 2);
            return (
              <div
                key={match.id}
                className="px-5 py-3.5 flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Score badge */}
                <div
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${sc}15`, border: `1px solid ${sc}44` }}
                >
                  <span className="text-sm font-bold leading-none" style={{ color: sc }}>
                    {match.match_score ?? "—"}
                  </span>
                  {match.match_score !== null && (
                    <span className="text-[8px] mt-0.5" style={{ color: sc, opacity: 0.7 }}>%</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{match.job_title}</p>
                    <span
                      className="shrink-0 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ color: "#c4b5fd", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}
                    >
                      {match.company_name ?? "Resume match"}
                    </span>
                  </div>

                  {match.why && (
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{match.why}</p>
                  )}

                  {strengths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] uppercase tracking-wide text-slate-600">Strengths</span>
                      {strengths.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.28)" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {missing.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] uppercase tracking-wide text-slate-600">Missing</span>
                      {missing.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.28)" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {learn.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-slate-600">Learn next</span>
                      {learn.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ background: "rgba(124,58,237,0.1)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.28)" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-600 mt-1.5">{formatRelative(match.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
