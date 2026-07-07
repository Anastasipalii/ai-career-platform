import Link from "next/link";
import { getAllDashboardTargets } from "./dashboardTargets";

/**
 * Explains the Workflow Studio → Dashboard relationship: the Studio runs
 * automations, and their outputs are routed back into the user's personal
 * Dashboard workspace. Presentational and forward-looking — no data is written
 * yet, and the Dashboard itself is unchanged.
 */
export default function WorkflowOutputsExplainer() {
  const targets = getAllDashboardTargets();

  return (
    <section className="relative py-16 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-5">
            <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">
              Studio → Dashboard
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Outputs flow back to your <span className="gradient-text">Dashboard</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            The Studio is where automations run. When a workflow finishes, its
            results are routed into your personal workspace as one of the item
            types below — so the Dashboard stays your single source of truth.
          </p>
        </div>

        {/* Flow diagram: Run → Route → Dashboard */}
        <div className="flex items-stretch justify-center gap-3 flex-wrap mb-10">
          <div
            className="rounded-2xl px-5 py-4 border text-center"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(124,58,237,0.25)" }}
          >
            <div className="text-white font-semibold text-sm">Run a workflow</div>
            <div className="text-xs text-slate-500 mt-1">AI agents + automations</div>
          </div>

          <div className="flex items-center text-slate-600">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11h13M13 6l5 5-5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div
            className="rounded-2xl px-5 py-4 border text-center"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(6,182,212,0.25)" }}
          >
            <div className="text-white font-semibold text-sm">Output router</div>
            <div className="text-xs text-slate-500 mt-1">Maps results to entities</div>
          </div>

          <div className="flex items-center text-slate-600">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11h13M13 6l5 5-5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl px-5 py-4 border text-center transition-colors hover:border-white/25"
            style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(236,72,153,0.25)" }}
          >
            <div className="text-white font-semibold text-sm">Your Dashboard</div>
            <div className="text-xs text-slate-500 mt-1">Personal workspace</div>
          </Link>
        </div>

        {/* Destination entities */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {targets.map((t) => (
            <div
              key={t.entity}
              className="rounded-xl p-4 border"
              style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t.accent.color }}
                />
                <span className="text-white font-semibold text-[13px]">{t.label}</span>
                {t.planned && (
                  <span
                    className="text-[9px] uppercase tracking-wide px-1.5 py-px rounded ml-auto"
                    style={{ background: "rgba(236,72,153,0.15)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.25)" }}
                  >
                    new
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[12px] leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-600 text-center mt-8">
          Persistence is wired in a later phase — the Dashboard is unchanged for now.
        </p>
      </div>
    </section>
  );
}
