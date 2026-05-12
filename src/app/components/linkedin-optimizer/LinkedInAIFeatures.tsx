interface Feature {
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "Recruiter Keywords",
    description: "Adds recruiter-focused keywords to improve visibility and search ranking.",
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.1)",
    border: "rgba(10,102,194,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
  },
  {
    title: "ATS-Friendly Profile",
    description: "Optimizes your LinkedIn sections for recruiter systems and AI screening.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Multiple Languages",
    description: "Generate and optimize profiles in multiple languages including Arabic.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
];

export default function LinkedInAIFeatures() {
  return (
    <section className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(10,102,194,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
            style={{ borderColor: "rgba(10,102,194,0.3)", background: "rgba(10,102,194,0.08)" }}
          >
            <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#93c5fd" }}>
              Built-in features
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Everything you need to{" "}
            <span className="gradient-text">get found</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Professional LinkedIn optimization features built directly into the tool.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="feature-card">
              <div
                className="feature-card-glow"
                style={{ background: `radial-gradient(circle at 50% 0%, ${feat.bg} 0%, transparent 55%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: feat.bg, color: feat.color, border: `1px solid ${feat.border}` }}
              >
                {feat.icon}
              </div>

              <h3 className="text-white font-semibold text-base mb-2 leading-snug">{feat.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
