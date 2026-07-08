import type { WorkflowResults } from "@/lib/workflowResults";

interface WorkflowStatusCardProps {
  workflow: WorkflowResults;
}

// Read-only checklist reflecting what the latest workflow run produced.
// Uses existing workflow data only — no new fetching, no design changes.
export default function WorkflowStatusCard({ workflow }: WorkflowStatusCardProps) {
  const items: { label: string; done: boolean }[] = [
    { label: "Resume uploaded", done: Boolean(workflow.resumeName) || workflow.resumeOptimized },
    { label: "ATS completed", done: typeof workflow.atsScore === "number" && workflow.atsScore > 0 },
    { label: "Job matches generated", done: (workflow.jobMatches?.length ?? workflow.jobMatchesCount ?? 0) > 0 },
    { label: "Cover letter generated", done: Boolean(workflow.coverLetterText?.trim()) || workflow.coverLetterGenerated },
    { label: "Interview questions generated", done: (workflow.interviewQuestions?.length ?? 0) > 0 },
  ];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Workflow Status</h2>
        <span className="text-xs text-slate-500">Latest run</span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={
                item.done
                  ? { background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {item.done ? (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.2 5 8.5l4.5-5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#475569" }} />
              )}
            </span>
            <span className="text-xs font-medium" style={{ color: item.done ? "#e2e8f0" : "#64748b" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
