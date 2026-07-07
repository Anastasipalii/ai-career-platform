import { ReactNode } from "react";

interface Rec {
  icon: ReactNode;
  title: string;
  body: string;
  color: string;
  bg: string;
  border: string;
  tag?: string;
}

const recs: Rec[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Best Next Role",
    body: "Your strongest next step is Design Lead or Staff Designer at a Series B–D AI startup — your systems experience and AI product background are rare at this level.",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
    tag: "High fit",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
    title: "Learning Priorities",
    body: "Focus first on People Management and Design Strategy. These are the two skills that separate Senior from Head of Design — and both can be developed without leaving your current role.",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: "Portfolio Project Ideas",
    body: "Build a public design system on GitHub, document the before/after with metrics, and write a Substack essay about your design decisions. This trifecta is what gets senior designers noticed.",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    title: "LinkedIn Improvements",
    body: "Update your headline to include \"Design Systems at Scale\" and \"AI Products\". Add a featured section with your top 3 case study links. Recruiters at your target companies search for these exact terms.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Resume Improvements",
    body: "Add metrics to 3 more bullet points. Your recent design-system work is strong but \"built design system\" needs to become \"built design system used by 12 teams, reducing handoff time by 60%.\" Specificity wins.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    tag: "Quick win",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: "Interview Focus Areas",
    body: "Prepare 3 stories around \"influencing without authority\", 2 around \"building from zero\", and 1 about a failure you learned from. These are the questions you will definitely face at Head level.",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
  },
];

export default function AIRecommendations() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#fbcfe8" }}>
              AI recommendations
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Your personalised{" "}
            <span className="gradient-text">action plan</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Six targeted recommendations — ranked by impact on your
            career progression from Senior to Head of Design.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recs.map((rec) => (
            <div
              key={rec.title}
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 cursor-default"
              style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${rec.bg} 0%, transparent 55%)` }}
              />
              <div className="flex items-start justify-between gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: rec.bg, color: rec.color, border: `1px solid ${rec.border}` }}
                >
                  {rec.icon}
                </div>
                {rec.tag && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: rec.bg, color: rec.color, border: `1px solid ${rec.border}` }}
                  >
                    {rec.tag}
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold text-base mb-2 leading-snug">{rec.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{rec.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
