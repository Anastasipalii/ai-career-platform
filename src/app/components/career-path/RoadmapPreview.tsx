import { ROADMAP_PHASES, CareerGoalData } from "@/app/components/career-path/types";

interface RoadmapPreviewProps {
  generated: boolean;
  data: CareerGoalData;
}

export default function RoadmapPreview({ generated, data }: RoadmapPreviewProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Roadmap preview</p>
        <div className="flex items-center gap-3">
          {generated && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(236,72,153,0.12)", color: "#fbcfe8", border: "1px solid rgba(236,72,153,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-pink-400 animate-pulse" />
              AI generated
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: "rgba(13,13,22,0.6)", position: "relative" }}>
        {/* Goal header */}
        {generated && (
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(236,72,153,0.05)" }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-white">{data.currentTitle || "Product Designer"}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: "#ec4899" }}>
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-medium text-white">{data.targetTitle || "Head of Design"}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{data.timeGoal} plan · {data.workStyle}</p>
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-col gap-3">
            {ROADMAP_PHASES.map((phase, idx) => (
              <div key={phase.id} className="flex items-start gap-3">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: generated ? phase.bg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${generated ? phase.color + "55" : "rgba(255,255,255,0.08)"}`,
                      color: generated ? phase.color : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {phase.id}
                  </div>
                  {idx < ROADMAP_PHASES.length - 1 && (
                    <div
                      className="w-px mt-1 flex-1"
                      style={{
                        height: "28px",
                        background: generated
                          ? `linear-gradient(to bottom, ${phase.color}44, transparent)`
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                </div>

                {/* Phase info */}
                <div className="pb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: generated ? phase.color : "rgba(255,255,255,0.35)" }}
                    >
                      {phase.title}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">{phase.months}</span>
                  {generated && (
                    <p className="text-xs text-slate-500 mt-1">
                      {phase.tasks.length} milestones
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay when not generated */}
        {!generated && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5,5,10,0.6)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-white mb-1">Your roadmap will appear here</div>
              <div className="text-xs text-slate-500">Fill in your goals and click Create Roadmap</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
