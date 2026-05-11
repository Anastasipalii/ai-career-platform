import Link from "next/link";

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
    </div>
  );
}
