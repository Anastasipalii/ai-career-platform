import { ActivityItem } from "@/app/components/dashboard/DashboardClient";

const TYPE_CONFIG: Record<
  ActivityItem["type"],
  { color: string; bg: string; icon: React.ReactNode }
> = {
  resume: {
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1H3.5a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V5L8 1z" />
        <path d="M8 1v4h3" />
      </svg>
    ),
  },
  cover_letter: {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 3.5h11v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8z" />
        <path d="M1.5 3.5l5.5 4.5 5.5-4.5" />
      </svg>
    ),
  },
  interview: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="1.5" width="6" height="7" rx="3" />
        <path d="M2 9a5 5 0 0010 0" />
        <line x1="7" y1="13" x2="7" y2="11" />
      </svg>
    ),
  },
  job_match: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6.5" cy="6.5" r="5" />
        <path d="M10.5 10.5l3 3" strokeWidth="1.5" />
      </svg>
    ),
  },
  task: {
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2.5H3.5a1 1 0 00-1 1v8a1 1 0 001 1h7a1 1 0 001-1v-8a1 1 0 00-1-1H9" />
        <rect x="5" y="1.5" width="4" height="2" rx="0.5" />
        <path d="M5 7l1.5 1.5L9 6" />
      </svg>
    ),
  },
};

interface RecentActivityProps {
  activities: ActivityItem[];
  formatRelative: (iso: string) => string;
}

export default function RecentActivity({ activities, formatRelative }: RecentActivityProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 15 5 9 9 12 13 6 17 8" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No activity yet</p>
          <p className="text-xs text-slate-600">Start by creating your first resume.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          {activities.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
                >
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{item.action}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.detail}</p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 mt-0.5 tabular-nums">
                  {formatRelative(item.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
