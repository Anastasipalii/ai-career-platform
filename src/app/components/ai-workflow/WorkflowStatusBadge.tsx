import type { WorkflowStepStatus } from "./flowSteps";

const STATUS_STYLE: Record<
  WorkflowStepStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  waiting: { label: "Waiting", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.22)" },
  running: { label: "Running", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  completed: { label: "Completed", color: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStepStatus;
  size?: "sm" | "md";
}

export default function WorkflowStatusBadge({ status, size = "sm" }: WorkflowStatusBadgeProps) {
  const s = STATUS_STYLE[status];
  const pad = size === "md" ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status === "running" ? (
        <span
          className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${s.color}66`, borderTopColor: "transparent" }}
        />
      ) : status === "completed" ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2 5 8.5l4.5-5" stroke={s.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      )}
      {s.label}
    </span>
  );
}
