import { ReactNode } from "react";

interface Stat {
  label: string;
  value: string;
  trend: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const stats: Stat[] = [
  {
    label: "Total Resumes",
    value: "3",
    trend: "+1 this week",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 1.5H4a1 1 0 00-1 1v13a1 1 0 001 1h10a1 1 0 001-1V6l-4.5-4.5z" />
        <path d="M10.5 1.5V6H15" />
        <path d="M6 9.5h6M6 12h4" />
      </svg>
    ),
  },
  {
    label: "Cover Letters",
    value: "5",
    trend: "+2 this week",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5h14v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
        <path d="M2 5l7 6 7-6" />
      </svg>
    ),
  },
  {
    label: "Interview Sessions",
    value: "8",
    trend: "Last: 88/100",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5.5" y="2" width="7" height="9" rx="3.5" />
        <path d="M3 10.5a6 6 0 0012 0" />
        <line x1="9" y1="16.5" x2="9" y2="14" />
        <line x1="6.5" y1="16.5" x2="11.5" y2="16.5" />
      </svg>
    ),
  },
  {
    label: "Job Matches",
    value: "127",
    trend: "5 new today",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M13 13l3.5 3.5" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    label: "Languages Used",
    value: "4",
    trend: "EN · DE · PL · ES",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7.5" />
        <line x1="1.5" y1="9" x2="16.5" y2="9" />
        <path d="M9 1.5a11 11 0 010 15M9 1.5a11 11 0 000 15" />
      </svg>
    ),
  },
  {
    label: "Avg ATS Score",
    value: "92%",
    trend: "+3% this month",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 13 6 8 10 11 14 5 16 7" />
      </svg>
    ),
  },
];

export default function QuickStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-7">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl p-4 border transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15"
          style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
          >
            {s.icon}
          </div>
          <div className="text-xl font-bold text-white leading-none mb-1">{s.value}</div>
          <div className="text-xs text-slate-400 mb-1">{s.label}</div>
          <div className="text-[10px] text-slate-600">{s.trend}</div>
        </div>
      ))}
    </div>
  );
}
