import Link from "next/link";
import { FileText, Mail, Mic, Languages, Search, Network } from "lucide-react";
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
    icon: <FileText size={20} />,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    label: "Cover Letter",
    href: "/cover-letter",
    icon: <Mail size={20} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    label: "Mock Interview",
    href: "/interview-coach",
    icon: <Mic size={20} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    label: "Translate",
    href: "/resume-translation",
    icon: <Languages size={20} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    label: "Job Match",
    href: "/job-match",
    icon: <Search size={20} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
  },
  {
    label: "LinkedIn",
    href: "/linkedin-optimizer",
    icon: <Network size={20} />,
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.1)",
    border: "rgba(10,102,194,0.2)",
  },
];

export default function QuickActions() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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
            <div
              className="transition-transform duration-200 group-hover:scale-110"
              style={{ color: action.color }}
            >
              {action.icon}
            </div>
            <span className="text-xs font-medium" style={{ color: action.color }}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
