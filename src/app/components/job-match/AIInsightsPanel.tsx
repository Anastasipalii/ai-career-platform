import { ReactNode } from "react";

interface Insight {
  icon: ReactNode;
  title: string;
  body: string;
  color: string;
  bg: string;
  border: string;
  tag?: string;
}

const insights: Insight[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Best Matching Roles",
    body: "Your profile is a strong fit for: Senior Product Designer, Design Lead, Head of Design, and Staff Designer — especially in AI-first companies.",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    tag: "Top match",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Missing Skills",
    body: "Motion Design, Figma Variables, and Dev Mode knowledge appear in 67% of your matched roles. Adding these could raise your average match score by ~12 points.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    tag: "Action needed",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Resume Tips",
    body: "Add quantified metrics to 3 more bullet points. Recruiters spend 6 seconds on first scan — your top achievement should appear above the fold.",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21l-4.35-4.35" /><circle cx="11" cy="11" r="8" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
    title: "Keyword Suggestions",
    body: "Add to your resume: \"AI interface design\", \"cross-functional leadership\", \"design systems at scale\", \"data-informed UX\" — these appear in 80% of target roles.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
    title: "Market Demand",
    body: "Senior Product Designer roles are up 23% this quarter. AI-focused design positions have grown 41% YoY — your AI/ML experience is a strong differentiator.",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
    tag: "Trending",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    title: "Salary Insights",
    body: "For Senior Product Designer in San Francisco: $140k–$195k base. Remote roles offer $120k–$175k. With your experience level, aim for the top 30% of the range.",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
  },
];

export default function AIInsightsPanel() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#c4b5fd" }}>
              AI insights
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Understand your{" "}
            <span className="gradient-text">job market position</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Six AI-powered insights that show exactly where you stand and what
            to do next to accelerate your job search.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {insights.map((ins) => (
            <div
              key={ins.title}
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 cursor-default"
              style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${ins.bg} 0%, transparent 55%)` }}
              />
              <div className="flex items-start justify-between gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: ins.bg, color: ins.color, border: `1px solid ${ins.border}` }}
                >
                  {ins.icon}
                </div>
                {ins.tag && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: ins.bg, color: ins.color, border: `1px solid ${ins.border}` }}
                  >
                    {ins.tag}
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold text-base mb-2 leading-snug">{ins.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{ins.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
