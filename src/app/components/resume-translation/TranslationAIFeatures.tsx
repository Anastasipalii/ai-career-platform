import { ReactNode } from "react";

interface Feature {
  icon:        ReactNode;
  title:       string;
  description: string;
  color:       string;
  bg:          string;
  border:      string;
}

const features: Feature[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    title:       "Smart Translation",
    description: "Keeps your resume professional and natural — not just word-for-word, but context-aware and career-ready.",
    color:  "#10b981",
    bg:     "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
      </svg>
    ),
    title:       "ATS-Safe Formatting",
    description: "Preserves layout and machine-readable structure so your resume passes automated screening in any language.",
    color:  "#7c3aed",
    bg:     "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title:       "Multiple Languages",
    description: "Translate documents for international job markets — 25+ languages including Arabic, German, Japanese, and more.",
    color:  "#06b6d4",
    bg:     "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
];

export default function TranslationAIFeatures() {
  return (
    <section className="py-20 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            More than a{" "}
            <span className="gradient-text">direct translation</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Three layers of intelligence that turn your resume into a job-market-ready document in any language.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
              style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${feat.bg} 0%, transparent 55%)` }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: feat.bg, color: feat.color, border: `1px solid ${feat.border}` }}
              >
                {feat.icon}
              </div>
              <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{feat.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
