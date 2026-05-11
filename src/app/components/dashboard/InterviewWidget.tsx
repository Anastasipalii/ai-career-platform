import Link from "next/link";

interface Session {
  type: string;
  score: number;
  language: string;
  date: string;
  feedback: string;
}

const sessions: Session[] = [
  {
    type: "HR Interview",
    score: 88,
    language: "English (US)",
    date: "2 days ago",
    feedback: "Strong STAR answers. Improve confidence score with more direct delivery.",
  },
  {
    type: "Behavioral Interview",
    score: 75,
    language: "English (US)",
    date: "5 days ago",
    feedback: "Good structure. Add more quantified results to each answer.",
  },
];

function scoreColor(n: number) {
  if (n >= 85) return "#10b981";
  if (n >= 70) return "#f59e0b";
  return "#ef4444";
}

export default function InterviewWidget() {
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

      <div className="p-5 flex flex-col gap-3">
        {sessions.map((s) => {
          const sc = scoreColor(s.score);
          return (
            <div
              key={s.type}
              className="rounded-xl p-4 border transition-all duration-200 hover:border-white/15"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{s.type}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.language} · {s.date}</p>
                </div>
                <div
                  className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5 shrink-0"
                  style={{ background: `${sc}15`, border: `1px solid ${sc}44` }}
                >
                  <span className="text-base font-bold leading-none" style={{ color: sc }}>{s.score}</span>
                  <span className="text-[9px] font-medium mt-0.5" style={{ color: sc, opacity: 0.7 }}>/ 100</span>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.score}%`, background: sc }}
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{s.feedback}</p>
            </div>
          );
        })}

        {/* CTA */}
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
    </div>
  );
}
