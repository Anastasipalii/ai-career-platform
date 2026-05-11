import Link from "next/link";
import { ReactNode } from "react";

interface Action {
  label: string;
  href: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const actions: Action[] = [
  {
    label: "New Resume",
    href: "/resume-builder",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V7l-4.5-5z" />
        <path d="M11.5 2V7H16" />
        <path d="M7 11h6M7 14h4" />
      </svg>
    ),
  },
  {
    label: "Cover Letter",
    href: "/cover-letter",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h14v11a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
        <path d="M3 6l7 6 7-6" />
      </svg>
    ),
  },
  {
    label: "Mock Interview",
    href: "/interview-coach",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="6" height="10" rx="3" />
        <path d="M3 11a7 7 0 0014 0" />
        <line x1="10" y1="18" x2="10" y2="14" />
        <line x1="7" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
  {
    label: "Translate",
    href: "/resume-translation",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8.5" />
        <line x1="1.5" y1="10" x2="18.5" y2="10" />
        <path d="M10 1.5a12 12 0 010 17M10 1.5a12 12 0 000 17" />
      </svg>
    ),
  },
  {
    label: "Job Match",
    href: "/job-match",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M14.5 14.5l4 4" strokeWidth="2" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "/linkedin-optimizer",
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.1)",
    border: "rgba(10,102,194,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="16" height="16" rx="3" />
        <path d="M6 9v5M6 7.5V8" />
        <path d="M10 14V11a2.5 2.5 0 015 0v3M10 11v3" />
      </svg>
    ),
  },
];

export default function QuickActions() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-center transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5 group"
            style={{ background: action.bg, borderColor: `${action.color}33` }}
          >
            <div style={{ color: action.color }}>{action.icon}</div>
            <span className="text-xs font-medium" style={{ color: action.color }}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
