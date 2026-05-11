import Link from "next/link";

interface Match {
  company: string;
  title: string;
  score: number;
  salary: string;
  workType: string;
}

const matches: Match[] = [
  { company: "Stripe",  title: "Senior Product Designer",  score: 95, salary: "$150k–$195k", workType: "Remote" },
  { company: "Figma",   title: "Lead UX Designer",          score: 88, salary: "$160k–$210k", workType: "Hybrid" },
  { company: "Linear",  title: "Product Design Lead",        score: 82, salary: "$140k–$185k", workType: "Remote" },
];

function scoreColor(n: number) {
  if (n >= 90) return "#10b981";
  if (n >= 80) return "#8b5cf6";
  return "#06b6d4";
}

const WORK_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  Remote: { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  Hybrid: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
};

export default function JobMatchesWidget() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Top Job Matches</h2>
        <Link href="/job-match" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
          See all 127 →
        </Link>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {matches.map((m) => {
          const sc = scoreColor(m.score);
          const wts = WORK_TYPE_STYLE[m.workType] ?? WORK_TYPE_STYLE.Remote;
          return (
            <div
              key={m.company}
              className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Score badge */}
              <div
                className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ background: `${sc}15`, border: `1px solid ${sc}44` }}
              >
                <span className="text-sm font-bold leading-none" style={{ color: sc }}>{m.score}</span>
                <span className="text-[9px] mt-0.5 font-medium" style={{ color: sc, opacity: 0.7 }}>match</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{m.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-400">{m.company}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs font-medium text-slate-300">{m.salary}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: wts.bg, color: wts.color }}
                  >
                    {m.workType}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/job-match"
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-90 shrink-0"
                style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}
              >
                View
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
