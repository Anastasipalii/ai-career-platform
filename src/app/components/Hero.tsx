import Link from "next/link";

export default function Hero() {
  const avatarColors = ["#7c3aed", "#06b6d4", "#ec4899", "#f59e0b"];
  const initials = ["A", "M", "S", "J"];

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden grid-bg">
      {/* Background orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Main text content — flex-1 so it fills the viewport above the dashboard card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <div className="max-w-4xl w-full text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
              AI-powered career platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.12] mb-6">
            Land your{" "}
            <span className="gradient-text">dream job</span>
            <br />
            with the power of AI
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Build standout resumes, ace every interview, and match with top
            opportunities — all in one AI-powered platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                boxShadow: "0 0 36px rgba(124,58,237,0.35)",
              }}
            >
              Start for free
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/ai-workflow"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-300 text-sm border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
            >
              Explore AI Workflow
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {/* Avatars + count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                {avatarColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[#05050a] flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                    style={{ background: color }}
                  >
                    {initials[i]}
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-400">50,000+ job seekers</span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-white/10" />

            {/* Stars + rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#fbbf24">
                    <path d="M7 1l1.545 3.13L12 4.635l-2.5 2.436.59 3.44L7 8.885l-3.09 1.626.59-3.44L2 4.635l3.455-.505L7 1z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-slate-400">4.9 / 5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard preview — naturally at the bottom, no absolute positioning */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 hidden lg:block">
        <div
          className="rounded-t-2xl border-t border-l border-r border-white/[0.09] overflow-hidden"
          style={{
            background: "rgba(13,13,22,0.75)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 -24px 64px rgba(124,58,237,0.12)",
          }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <div className="ml-4 h-4 rounded bg-white/[0.05] w-44" />
            <div className="ml-auto h-4 rounded bg-white/[0.05] w-20" />
          </div>
          {/* Stats */}
          <div className="p-5 grid grid-cols-3 gap-4">
            {[
              { label: "Resume Score", value: "94%", sub: "ATS optimized", color: "#7c3aed" },
              { label: "Job Matches", value: "127", sub: "Updated today", color: "#06b6d4" },
              { label: "Interview Ready", value: "Yes", sub: "3 sessions done", color: "#10b981" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-4 border border-white/[0.05]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                <div className="text-2xl font-bold mb-0.5" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-xs text-slate-600">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
