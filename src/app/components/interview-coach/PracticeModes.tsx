import { ReactNode } from "react";

interface PracticeMode {
  icon:        ReactNode;
  title:       string;
  description: string;
  duration:    string;
  questions:   string;
  color:       string;
  bg:          string;
  border:      string;
}

const modes: PracticeMode[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title:       "Quick Practice",
    description: "5 core questions with instant AI feedback. The fastest way to build confidence before any interview.",
    duration:    "~15 min",
    questions:   "5 questions",
    color:       "#f59e0b",
    bg:          "rgba(245,158,11,0.1)",
    border:      "rgba(245,158,11,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title:       "HR Questions",
    description: "Behavioral, cultural fit, and soft-skill questions that trip up most candidates. Master the STAR method.",
    duration:    "~20 min",
    questions:   "8 questions",
    color:       "#06b6d4",
    bg:          "rgba(6,182,212,0.1)",
    border:      "rgba(6,182,212,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title:       "Technical Questions",
    description: "Role-specific technical, system design, and problem-solving questions based on your job description.",
    duration:    "~30 min",
    questions:   "10 questions",
    color:       "#10b981",
    bg:          "rgba(16,185,129,0.1)",
    border:      "rgba(16,185,129,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title:       "Full Simulation",
    description: "12-question end-to-end interview covering every stage — from opening to closing — with a complete performance report.",
    duration:    "~45 min",
    questions:   "12 questions",
    color:       "#7c3aed",
    bg:          "rgba(124,58,237,0.1)",
    border:      "rgba(124,58,237,0.2)",
  },
];

export default function PracticeModes() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#fcd34d" }}>
              Practice modes
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Train for every{" "}
            <span className="gradient-text">interview format</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Four targeted practice modes — from a 15-minute confidence boost to a full 45-minute simulation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modes.map((mode) => (
            <a
              key={mode.title}
              href="#coach"
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-1 cursor-pointer no-underline block"
              style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${mode.bg} 0%, transparent 55%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: mode.bg, color: mode.color, border: `1px solid ${mode.border}` }}
              >
                {mode.icon}
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-semibold text-base leading-snug">{mode.title}</h3>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: mode.bg, color: mode.color, border: `1px solid ${mode.border}` }}
                >
                  {mode.duration}
                </span>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mb-4">{mode.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{mode.questions}</span>
                <div
                  className="flex items-center gap-1.5 text-xs font-medium group-hover:gap-2 transition-all duration-200"
                  style={{ color: mode.color }}
                >
                  Start practice
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="group-hover:translate-x-0.5 transition-transform duration-200">
                    <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
