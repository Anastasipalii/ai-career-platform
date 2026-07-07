"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
  Upload, Sparkles, Gauge, Search, ClipboardList, LayoutDashboard, ArrowRight,
} from "lucide-react";

interface Step {
  title: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const STEPS: Step[] = [
  {
    title: "Upload Resume",
    icon: <Upload size={20} />,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
  },
  {
    title: "AI Analysis",
    icon: <Sparkles size={20} />,
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.1)",
    border: "rgba(34,211,238,0.25)",
  },
  {
    title: "ATS Optimization",
    icon: <Gauge size={20} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.25)",
  },
  {
    title: "Job Matching",
    icon: <Search size={20} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
  },
  {
    title: "Application Package",
    icon: <ClipboardList size={20} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.25)",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
              End-to-end pipeline
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            How <span className="gradient-text">CareerAI</span> Works
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            From resume to ready-to-send application — six connected steps that
            take you from first draft to a fully tracked job search.
          </p>
        </div>

        {/* Pipeline */}
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-center gap-3 lg:gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col lg:flex-row lg:items-stretch gap-3 lg:gap-2 lg:flex-1"
            >
              {/* Step card */}
              <div
                className="flex-1 flex lg:flex-col items-center gap-4 lg:gap-3 rounded-2xl p-5 lg:py-6 lg:px-4 border text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(13,13,22,0.6)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${step.color}55`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${step.color}22`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: step.bg, color: step.color, border: `1px solid ${step.border}` }}
                >
                  {step.icon}
                </div>
                <div className="lg:mt-1">
                  <span className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Step {i + 1}
                  </span>
                  <span className="text-white font-semibold text-sm leading-snug">
                    {step.title}
                  </span>
                </div>
              </div>

              {/* Connector arrow (between steps only) */}
              {i < STEPS.length - 1 && (
                <div className="flex items-center justify-center shrink-0 text-slate-600">
                  <ArrowRight size={18} className="hidden lg:block" />
                  <ArrowRight size={18} className="lg:hidden rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/ai-workflow"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              boxShadow: "0 0 36px rgba(124,58,237,0.35)",
            }}
          >
            Explore the complete workflow
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
