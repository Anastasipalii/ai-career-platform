export default function TranslationHero() {
  return (
    <section className="relative overflow-hidden grid-bg py-20">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.1) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6"
          style={{ borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.1)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#34d399" }} />
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#6ee7b7" }}>
            AI Resume Translation
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          Your resume,{" "}
          <span className="gradient-text">in any language</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
          Translate resumes and cover letters while preserving formatting and ATS-friendly structure.
        </p>

        <a
          href="#translator"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #059669, #7c3aed)",
            boxShadow: "0 0 32px rgba(5,150,105,0.3)",
          }}
        >
          Translate Resume
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}
