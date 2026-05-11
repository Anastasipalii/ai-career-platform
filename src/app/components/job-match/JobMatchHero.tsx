export default function JobMatchHero() {
  return (
    <section className="relative overflow-hidden grid-bg py-24">
      {/* Orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.13) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-7"
          style={{ borderColor: "rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.1)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#c4b5fd" }}>
            AI Job Match Engine
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Find jobs that{" "}
          <span className="gradient-text">match your skills</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume and discover the roles, companies, and opportunities
          that fit your experience best — with match scores, salary insights, and
          AI-powered resume improvement suggestions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <a
            href="#matcher"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              boxShadow: "0 0 36px rgba(139,92,246,0.4)",
            }}
          >
            Find Matching Jobs
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

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {[
            { value: "10k+",  label: "Live job listings" },
            { value: "AI",    label: "Match scoring" },
            { value: "95%",   label: "Match accuracy" },
            { value: "< 30s", label: "Results time" },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-white font-semibold text-base">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
              {i < arr.length - 1 && <div className="hidden sm:block w-px h-8 bg-white/[0.07]" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
