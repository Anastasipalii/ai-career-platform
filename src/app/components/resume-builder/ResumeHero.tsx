export default function ResumeHero() {
  return (
    <section className="relative overflow-hidden grid-bg py-24">
      {/* Ambient orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124,58,237,0.14) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
            AI Resume Builder
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Build your perfect resume
          <br />
          <span className="gradient-text">with the power of AI</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          ATS-optimized content, AI rewriting, multilingual translations, and
          professional templates — everything you need to stand out and get
          interviews faster.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <a
            href="#builder"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              boxShadow: "0 0 36px rgba(124,58,237,0.35)",
            }}
          >
            Create my resume
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M2.5 7.5h10M8.5 3.5l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href="#templates"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-300 text-sm border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
          >
            Explore templates
          </a>
        </div>

        {/* Stats row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
          {[
            { value: "99%", label: "ATS pass rate" },
            { value: "30+", label: "Languages supported" },
            { value: "4", label: "Premium templates" },
            { value: "<3 min", label: "Average build time" },
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
