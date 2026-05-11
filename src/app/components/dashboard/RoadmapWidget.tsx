import Link from "next/link";

const PROGRESS = 30;
const PHASES = [
  { label: "Foundation",    color: "#ec4899", done: true },
  { label: "Portfolio",     color: "#8b5cf6", done: false },
  { label: "Applications",  color: "#06b6d4", done: false },
  { label: "Interviews",    color: "#10b981", done: false },
];

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

      <div className="p-5">
        {/* Role transition */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="font-medium text-white">Senior Product Designer</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#ec4899" }}>
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-medium text-white">Head of Design</span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500">Overall progress</span>
            <span className="font-semibold" style={{ color: "#ec4899" }}>{PROGRESS}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${PROGRESS}%`, background: "linear-gradient(90deg, #be185d, #ec4899)" }}
            />
          </div>
        </div>

        {/* Phase dots */}
        <div className="flex items-center gap-2 mb-4">
          {PHASES.map((phase, i) => (
            <div key={phase.label} className="flex items-center gap-1.5 flex-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: phase.done ? phase.color : "rgba(255,255,255,0.15)" }}
              />
              <span className="text-[10px] truncate" style={{ color: phase.done ? phase.color : "#475569" }}>
                {phase.label}
              </span>
              {i < PHASES.length - 1 && (
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Next milestone */}
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: "rgba(236,72,153,0.07)", border: "1px solid rgba(236,72,153,0.15)" }}
        >
          <p className="text-slate-500 mb-0.5">Next milestone</p>
          <p className="font-medium text-white">Complete Motion Design course</p>
          <p className="text-slate-600 mt-0.5">9 months remaining · Phase 1</p>
        </div>
      </div>
    </div>
  );
}
