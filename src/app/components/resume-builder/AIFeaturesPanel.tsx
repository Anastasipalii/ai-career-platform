import { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const features: Feature[] = [
  {
    title: "ATS Score Optimizer",
    description:
      "Instantly score your resume against real ATS systems and get a prioritised breakdown of what to fix before you apply.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    title: "Resume Translation",
    description:
      "Translate your resume into 30+ languages while preserving professional formatting and tone — in one click.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    title: "AI Content Rewriter",
    description:
      "Paste weak bullet points and AI rewrites them into strong, quantified, keyword-rich impact statements that recruiters notice.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        <path d="M15 6l3 3" />
      </svg>
    ),
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    title: "Keyword Matching",
    description:
      "Paste a job description and AI highlights missing keywords, aligns your skills section, and reorders content by relevance.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    title: "Grammar & Style Fixes",
    description:
      "AI automatically corrects grammar, tense inconsistencies, passive voice, and formatting — across every section of your resume.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
      </svg>
    ),
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
  },
  {
    title: "Cover Letter Generator",
    description:
      "Generate a tailored, compelling cover letter from your resume and a job URL in under 30 seconds — no blank page paralysis.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
  },
];

export default function AIFeaturesPanel() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-5">
            <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">
              AI features
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            AI that works{" "}
            <span className="gradient-text">behind every word</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Six intelligent tools embedded directly into the builder — no
            copy-pasting between apps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 cursor-default"
              style={{
                background: "rgba(13,13,22,0.6)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${feat.bg} 0%, transparent 55%)`,
                }}
              />

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: feat.bg,
                  color: feat.color,
                  border: `1px solid ${feat.border}`,
                }}
              >
                {feat.icon}
              </div>

              <h3 className="text-white font-semibold text-base mb-2 leading-snug">
                {feat.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
