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
                  <p className="text-sm font-medium text-white truncate">{match.job_title}</p>
                  {match.company_name && (
                    <p className="text-[12px] text-slate-300 truncate mt-0.5">{match.company_name}</p>
                  )}

                  {(match.location || match.remote || (match.jobTypes && match.jobTypes.length) || match.publishedAt) && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {[
                        match.location || null,
                        match.remote ? "Remote" : null,
                        match.jobTypes && match.jobTypes.length ? match.jobTypes.join(" / ") : null,
                        match.publishedAt ? formatRelative(match.publishedAt) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  {/* Strengths / missing / learn-next are stored on the run but
                      intentionally hidden on the compact card (kept for a future
                      detailed vacancy page). */}
                  {/* Opens the REAL provider listing in a new tab — never submits. */}
                  {match.sourceUrl && (
                    <div className="mt-1.5">
                      <a
                        href={match.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium hover:underline"
                        style={{ color: "#7dd3fc" }}
                      >
                        View &amp; apply ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
