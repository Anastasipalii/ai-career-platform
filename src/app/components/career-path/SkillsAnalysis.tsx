const CURRENT_SKILLS = [
  "Figma", "UX Research", "Design Systems", "Prototyping",
  "React", "A/B Testing", "Accessibility", "Cross-functional Leadership",
];

const MISSING_SKILLS = [
  { skill: "Motion Design",       priority: "High",   note: "Required in 70% of Lead Designer roles" },
  { skill: "Stakeholder Mgmt",    priority: "High",   note: "Critical for Head of Design transition" },
  { skill: "People Management",   priority: "High",   note: "Needed to lead a design team" },
  { skill: "Design Strategy",     priority: "Medium", note: "Expected at director/head level" },
];

const IMPROVE_SKILLS = [
  { skill: "Data Analysis",        note: "Strengthen metrics-driven design decisions" },
  { skill: "Figma Variables",      note: "Advanced design systems capability" },
  { skill: "Executive Presenting", note: "Communicate design value to C-suite" },
];

const CERTIFICATIONS = [
  { name: "Google UX Design Certificate",   provider: "Coursera",     duration: "6 months" },
  { name: "DesignOps Fundamentals",         provider: "Nielsen Norman", duration: "2 days" },
  { name: "Interaction Design Foundation",  provider: "IDF",           duration: "Self-paced" },
];

const PROJECTS = [
  { title: "Redesign an existing SaaS product",        impact: "Demonstrates initiative and product thinking" },
  { title: "Build an open-source design system",       impact: "Shows leadership and technical depth" },
  { title: "Create a motion design case study",        impact: "Closes the most critical skill gap" },
];

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  High:   { color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  Medium: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
};

export default function SkillsAnalysis() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#fbcfe8" }}>
              Skills analysis
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Where you are,{" "}
            <span className="gradient-text">where you need to be</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            A clear breakdown of your current strengths, skill gaps, and the exact
            certifications and projects that will accelerate your path.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Current skills */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#10b981" }} />
              <h3 className="text-white font-semibold text-base">Current Skills</h3>
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                {CURRENT_SKILLS.length} strong
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CURRENT_SKILLS.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2.5 2.5L7 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Missing skills */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#f59e0b" }} />
              <h3 className="text-white font-semibold text-base">Missing Skills</h3>
              <span
                className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                {MISSING_SKILLS.length} gaps
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {MISSING_SKILLS.map((item) => {
                const ps = PRIORITY_STYLE[item.priority];
                return (
                  <div
                    key={item.skill}
                    className="flex items-start gap-3 rounded-xl p-3 border"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ background: ps.bg, color: ps.color }}
                    >
                      {item.priority.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.skill}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills to improve */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#06b6d4" }} />
              <h3 className="text-white font-semibold text-base">Skills to Improve</h3>
            </div>
            <div className="flex flex-col gap-3">
              {IMPROVE_SKILLS.map((item) => (
                <div
                  key={item.skill}
                  className="rounded-xl p-3.5 border"
                  style={{ background: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.15)" }}
                >
                  <p className="text-sm font-semibold text-white mb-0.5">{item.skill}</p>
                  <p className="text-xs text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Certifications */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#8b5cf6" }} />
              <h3 className="text-white font-semibold text-base">Recommended Certifications</h3>
            </div>
            <div className="flex flex-col gap-3">
              {CERTIFICATIONS.map((cert) => (
                <div
                  key={cert.name}
                  className="flex items-start gap-3 rounded-xl p-3.5 border transition-all duration-200 hover:border-white/15"
                  style={{ background: "rgba(139,92,246,0.07)", borderColor: "rgba(139,92,246,0.15)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#c4b5fd" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7" cy="5.5" r="3.5" />
                      <path d="M3.5 9.5L2 12l2.5-.5L7 13l2.5-1.5L12 12l-1.5-2.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white leading-snug">{cert.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cert.provider} · {cert.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended projects */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "#ec4899" }} />
              <h3 className="text-white font-semibold text-base">Recommended Projects</h3>
            </div>
            <div className="flex flex-col gap-3">
              {PROJECTS.map((proj, i) => (
                <div
                  key={proj.title}
                  className="rounded-xl p-3.5 border transition-all duration-200 hover:border-white/15"
                  style={{ background: "rgba(236,72,153,0.07)", borderColor: "rgba(236,72,153,0.15)" }}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: "rgba(236,72,153,0.2)", color: "#fbcfe8" }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white leading-snug">{proj.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{proj.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
