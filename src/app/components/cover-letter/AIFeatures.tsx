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
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    title:       "Tailored to Job Description",
    description: "AI reads the job posting and mirrors the language, requirements, and priorities that hiring managers care about most.",
    color:  "#7c3aed",
    bg:     "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    title:       "Multiple Languages",
    description: "Generate polished cover letters in 16+ languages including German, French, Spanish, Ukrainian, and more — no translation quality loss.",
    color:  "#10b981",
    bg:     "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 10V2M4 5l3.5-3.5L11 5M2 13h11" />
        <rect x="9" y="13" width="13" height="8" rx="2" />
        <path d="M12 17h7M12 20h4" />
      </svg>
    ),
    title:       "One-Click Export",
    description: "Download as a clean, ATS-safe PDF, copy formatted text, or save directly to your CareerAI dashboard — all in a single click.",
    color:  "#8b5cf6",
    bg:     "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
  },
];

export default function AIFeatures() {
  return (
    <section className="py-20 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(6,182,212,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Built to get you{" "}
            <span className="gradient-text">hired faster</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            Three core capabilities that make the difference between a letter that gets ignored and one that gets a response.
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
