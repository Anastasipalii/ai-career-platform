export default function AIWorkflowHero() {
  return (
    <section className="relative overflow-hidden grid-bg py-24">
      {/* Orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-7"
          style={{ borderColor: "rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.1)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#c4b5fd" }}>
            AI Workflow Studio
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Chain your AI tools into{" "}
          <span className="gradient-text">automated workflows</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Compose the platform&apos;s AI agents, n8n automations, and scheduled
          triggers into end-to-end workflows — from a job description to a
          ready-to-send application kit, running on autopilot.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <a
            href="#workflows"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              boxShadow: "0 0 36px rgba(124,58,237,0.35)",
            }}
          >
            Browse workflows
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <span
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-300 text-sm border border-white/10"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#67e8f9" }} />
            Execution engine — coming soon
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {[
            { value: "5", label: "Starter workflows" },
            { value: "7", label: "AI agents to chain" },
            { value: "n8n", label: "Automation ready" },
            { value: "DAG", label: "Multi-step logic" },
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
