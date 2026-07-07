import { getWorkflowOutputs } from "./dashboardTargets";

interface OutputTargetsProps {
  /** Workflow slug — resolved to its Dashboard destinations. */
  slug: string;
}

/**
 * Compact "Saves to Dashboard →" strip shown on a workflow card. Presentational
 * only: it documents where a completed run's outputs will land. No persistence
 * happens yet.
 */
export default function OutputTargets({ slug }: OutputTargetsProps) {
  const targets = getWorkflowOutputs(slug);
  if (targets.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 6h9M7 2.5 10.5 6 7 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saves to Dashboard
        </span>

        {targets.map((t) => (
          <span
            key={t.entity}
            title={t.description}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
            style={{ background: t.accent.bg, color: t.accent.color, border: `1px solid ${t.accent.border}` }}
          >
            {t.label}
            {t.planned && (
              <span
                className="text-[9px] uppercase tracking-wide px-1 py-px rounded"
                style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}
              >
                new
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
