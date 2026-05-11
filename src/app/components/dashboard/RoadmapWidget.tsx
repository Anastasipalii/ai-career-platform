import Link from "next/link";

export default function RoadmapWidget() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Career Roadmap</h2>
        <Link href="/career-path" className="text-xs text-pink-400 hover:text-pink-300 transition-colors font-medium">
          View full →
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.15)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f9a8d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 13 5 8 9 11 13 5 17 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">No roadmap created yet</p>
        <p className="text-xs text-slate-600 mb-3">Map your path from where you are to where you want to be.</p>
        <Link
          href="/career-path"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: "rgba(236,72,153,0.12)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.2)" }}
        >
          Create roadmap
        </Link>
      </div>
    </div>
  );
}
