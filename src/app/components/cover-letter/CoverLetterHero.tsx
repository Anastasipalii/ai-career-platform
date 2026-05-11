export default function CoverLetterHero() {
  return (
    <section className="relative overflow-hidden grid-bg py-24">
      {/* Orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">
            AI Cover Letter Generator
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Cover letters that{" "}
          <span className="gradient-text">get you interviews</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Create personalized, professional cover letters tailored to each job
          application in seconds — available in 16+ languages with adjustable
          tone and one-click PDF export.
        </p>

        {/* Language note */}
        <p className="text-sm text-slate-500 mb-10">
          Supports{" "}
          <span className="text-slate-300">English, German, Spanish, French, Ukrainian, Polish</span>{" "}
          and 10 more languages.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <a
            href="#generator"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              boxShadow: "0 0 36px rgba(124,58,237,0.35)",
            }}
          >
            Generate Cover Letter
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href="#upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-300 text-sm border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 10V2M4 5l3.5-3.5L11 5M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Upload Resume
          </a>
        </div>

        {/* Stats row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
          {[
            { value: "< 30s",  label: "Generation time" },
            { value: "16+",    label: "Languages" },
            { value: "5",      label: "Tone styles" },
            { value: "100%",   label: "ATS-safe format" },
          ].map((stat, i, arr) => (
            <div key={stat.label} className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-white font-semibold text-base">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-white/[0.07]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
