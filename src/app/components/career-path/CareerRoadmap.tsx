import { ROADMAP_PHASES } from "@/app/components/career-path/types";

export default function CareerRoadmap() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(236,72,153,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#fbcfe8" }}>
              12-month roadmap
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Your step-by-step{" "}
            <span className="gradient-text">career roadmap</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Four structured phases — each with concrete milestones, prioritised
            by impact, so you always know exactly what to do next.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block relative">
          {/* Connecting line */}
          <div
            className="absolute top-[28px] left-[5%] right-[5%] h-px"
            style={{ background: "linear-gradient(90deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3), rgba(6,182,212,0.3), rgba(16,185,129,0.3))" }}
          />

          <div className="grid grid-cols-4 gap-6">
            {ROADMAP_PHASES.map((phase) => (
              <div key={phase.id} className="flex flex-col items-center">
                {/* Phase dot */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mb-5 relative z-10"
                  style={{
                    background: phase.bg,
                    border: `2px solid ${phase.color}55`,
                    color: phase.color,
                    boxShadow: `0 0 24px ${phase.color}33`,
                  }}
                >
                  {phase.id}
                </div>

                <div
                  className="rounded-2xl p-5 border w-full transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
                  style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="mb-4">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: phase.bg, color: phase.color, border: `1px solid ${phase.color}44` }}
                    >
                      {phase.months}
                    </span>
                    <h3 className="text-white font-semibold text-base mt-2">{phase.title}</h3>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {phase.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: phase.color, opacity: 0.7 }}
                        />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/tablet: vertical timeline */}
        <div className="lg:hidden flex flex-col gap-0">
          {ROADMAP_PHASES.map((phase, idx) => (
            <div key={phase.id} className="flex items-start gap-5">
              {/* Left: dot + line */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold relative z-10"
                  style={{
                    background: phase.bg,
                    border: `2px solid ${phase.color}55`,
                    color: phase.color,
                    boxShadow: `0 0 20px ${phase.color}33`,
                  }}
                >
                  {phase.id}
                </div>
                {idx < ROADMAP_PHASES.length - 1 && (
                  <div
                    className="w-px flex-1 my-1"
                    style={{
                      height: "40px",
                      background: `linear-gradient(to bottom, ${phase.color}44, transparent)`,
                    }}
                  />
                )}
              </div>

              {/* Right: card */}
              <div
                className="flex-1 rounded-2xl p-5 border mb-6 transition-all duration-300 hover:border-white/20"
                style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-2"
                  style={{ background: phase.bg, color: phase.color, border: `1px solid ${phase.color}44` }}
                >
                  {phase.months}
                </span>
                <h3 className="text-white font-semibold text-base mb-3">{phase.title}</h3>
                <ul className="flex flex-col gap-2">
                  {phase.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: phase.color, opacity: 0.7 }} />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
