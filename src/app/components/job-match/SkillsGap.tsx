const HAVE_SKILLS = [
  "Figma", "UX Research", "Design Systems", "Prototyping",
  "React", "A/B Testing", "Accessibility", "Cross-functional Leadership",
];

const IMPROVE_SKILLS = [
  { skill: "Motion Design",    priority: "High",   reason: "Required in 67% of matched roles" },
  { skill: "Figma Variables",  priority: "High",   reason: "New Figma feature expected by employers" },
  { skill: "Dev Mode",         priority: "Medium", reason: "Reduces designer-developer friction" },
  { skill: "Design Tokens",    priority: "Medium", reason: "Advanced design systems skill" },
];

const LEARNING_AREAS = [
  {
    title: "Motion Design Fundamentals",
    description: "Master After Effects and Figma Smart Animate for interface transitions",
    duration: "~4 weeks",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
  {
    title: "Advanced Figma Features",
    description: "Variables, Dev Mode, and component auto-layout best practices",
    duration: "~2 weeks",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
  },
  {
    title: "Design Tokens at Scale",
    description: "Token Studio, Style Dictionary, and multi-brand design systems",
    duration: "~3 weeks",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
];

const PRIORITY_COLOR: Record<string, { color: string; bg: string }> = {
  High:   { color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  Medium: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
  Low:    { color: "#6ee7b7", bg: "rgba(16,185,129,0.1)" },
};

export default function SkillsGap() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#c4b5fd" }}>
              Skills analysis
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Your{" "}
            <span className="gradient-text">skills gap analysis</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            A clear picture of what you have, what you&apos;re missing, and exactly
            what to learn to close the gap.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Skills you have */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#10b981" }} />
              <h3 className="text-white font-semibold text-base">You already have</h3>
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                {HAVE_SKILLS.length} skills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HAVE_SKILLS.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Skills to improve */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#f59e0b" }} />
              <h3 className="text-white font-semibold text-base">To improve</h3>
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                {IMPROVE_SKILLS.length} gaps
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {IMPROVE_SKILLS.map((item) => {
                const pc = PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.Low;
                return (
                  <div
                    key={item.skill}
                    className="flex items-start gap-3 rounded-xl p-3 border"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ background: pc.bg, color: pc.color }}
                    >
                      {item.priority.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.skill}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended learning */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#8b5cf6" }} />
              <h3 className="text-white font-semibold text-base">Recommended learning</h3>
            </div>
            <div className="flex flex-col gap-3">
              {LEARNING_AREAS.map((area) => (
                <div
                  key={area.title}
                  className="rounded-xl p-4 border cursor-pointer transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5"
                  style={{ background: area.bg, borderColor: `${area.color}33` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-white leading-snug">{area.title}</p>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                    >
                      {area.duration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{area.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
