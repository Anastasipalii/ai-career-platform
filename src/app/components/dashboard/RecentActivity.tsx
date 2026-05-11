import { ReactNode } from "react";

interface Activity {
  action: string;
  detail: string;
  time: string;
  color: string;
  bg: string;
  icon: ReactNode;
}

const activities: Activity[] = [
  {
    action: "Resume updated",
    detail: "Product Designer — Vercel",
    time: "2 hours ago",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1H3.5a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V5L8 1z" />
        <path d="M8 1v4h3" />
      </svg>
    ),
  },
  {
    action: "Cover letter generated",
    detail: "Stripe · Senior Product Designer",
    time: "1 day ago",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 3.5h11v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8z" />
        <path d="M1.5 3.5l5.5 4.5 5.5-4.5" />
      </svg>
    ),
  },
  {
    action: "Interview practice completed",
    detail: "HR Interview · Score: 88/100",
    time: "2 days ago",
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
  {
    action: "LinkedIn profile optimised",
    detail: "Profile strength: 94%",
    time: "3 days ago",
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="12" height="12" rx="2" />
        <path d="M4 6.5v4M4 5v.3" />
        <path d="M7 10.5V8a2 2 0 014 0v2.5M7 8v2.5" />
      </svg>
    ),
  },
  {
    action: "Resume translated",
    detail: "English → German",
    time: "5 days ago",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="6" />
        <path d="M1 7h12M7 1a9 9 0 010 12M7 1a9 9 0 000 12" />
      </svg>
    ),
  },
  {
    action: "Career roadmap created",
    detail: "Senior Designer → Head of Design",
    time: "1 week ago",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 11 4 7 7 9 10 4 13 6" />
      </svg>
    ),
  },
];

export default function RecentActivity() {
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
        <button type="button" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          View all
        </button>
      </div>
      <div className="p-5">
        <div className="flex flex-col">
          {activities.map((act, idx) => (
            <div key={idx} className="flex items-start gap-3 group">
              {/* Dot + line */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: act.bg, color: act.color, border: `1px solid ${act.color}33` }}
                >
                  {act.icon}
                </div>
                {idx < activities.length - 1 && (
                  <div className="w-px h-5 my-0.5" style={{ background: "rgba(255,255,255,0.06)" }} />
                )}
              </div>
              {/* Content */}
              <div className="pb-4 min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white leading-snug">{act.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{act.detail}</p>
                  </div>
                  <span className="text-[11px] text-slate-600 whitespace-nowrap shrink-0 mt-0.5">{act.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
