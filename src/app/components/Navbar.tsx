"use client";

import { useState, useRef, useEffect } from "react";

const TOOLS = [
  {
    label: "Resume Builder",
    href: "/resume-builder",
    description: "ATS-optimized resumes in minutes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1.5H3.5a1 1 0 00-1 1v11a1 1 0 001 1h9a1 1 0 001-1V5L9 1.5z" />
        <path d="M9 1.5V5h3.5" />
        <path d="M5 8.5h6M5 10.5h4" />
      </svg>
    ),
    color: "#7c3aed",
  },
  {
    label: "Cover Letter Generator",
    href: "/cover-letter",
    description: "Personalised letters for every role",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
        <path d="M2 4l6 5 6-5" />
      </svg>
    ),
    color: "#06b6d4",
  },
  {
    label: "LinkedIn Optimizer",
    href: "/linkedin-optimizer",
    description: "AI-written headlines that get noticed",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="14" height="14" rx="2.5" />
        <path d="M4.5 7v4M4.5 5.5v.3" />
        <path d="M7.5 11V8.5A2 2 0 0111.5 8.5V11M7.5 8.5V11" />
      </svg>
    ),
    color: "#0a66c2",
  },
  {
    label: "Resume Translation",
    href: "/resume-translation",
    description: "Translate into 25+ languages instantly",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        <line x1="1.5" y1="8" x2="14.5" y2="8" />
        <path d="M8 1.5a10 10 0 010 13M8 1.5a10 10 0 000 13" />
      </svg>
    ),
    color: "#10b981",
  },
  {
    label: "Interview Coach",
    href: "/interview-coach",
    description: "AI mock interviews with real feedback",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="6" height="8" rx="3" />
        <path d="M2 9.5a6 6 0 0012 0" />
        <line x1="8" y1="15" x2="8" y2="12.5" />
        <line x1="5.5" y1="15" x2="10.5" y2="15" />
      </svg>
    ),
    color: "#f59e0b",
  },
  {
    label: "Job Match Engine",
    href: "/job-match",
    description: "Find roles where you're most competitive",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="5.5" />
        <path d="M11 11l3.5 3.5" strokeWidth="1.75" />
      </svg>
    ),
    color: "#8b5cf6",
  },
  {
    label: "Career Path Planner",
    href: "/career-path",
    description: "Step-by-step roadmap to your next role",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 13 5 7 9 10 13 4 15 6" />
      </svg>
    ),
    color: "#ec4899",
  },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing",  href: "#pricing" },
  { label: "About",    href: "#about" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [toolsOpen, setToolsOpen]         = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Close everything on route change (simple approach) */
  const closeAll = () => { setMobileOpen(false); setToolsOpen(false); };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{ background: "rgba(5,5,10,0.85)", backdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">

          {/* ── Logo ── */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="2.5" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">CareerAI</span>
          </a>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {/* Tools dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors duration-200"
                style={{ color: toolsOpen ? "#f1f5f9" : "#94a3b8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { if (!toolsOpen) (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
              >
                Tools
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className="transition-transform duration-200"
                  style={{ transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {toolsOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-[520px] rounded-2xl border p-3 grid grid-cols-2 gap-1"
                  style={{
                    background: "rgba(9,9,16,0.96)",
                    borderColor: "rgba(255,255,255,0.09)",
                    backdropFilter: "blur(24px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08)",
                    animation: "fadeInDown 0.15s ease",
                  }}
                >
                  {TOOLS.map((tool) => (
                    <a
                      key={tool.href}
                      href={tool.href}
                      onClick={closeAll}
                      className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 group"
                      style={{ color: "inherit" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150"
                        style={{ background: `${tool.color}18`, color: tool.color, border: `1px solid ${tool.color}33` }}
                      >
                        {tool.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white leading-snug">{tool.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{tool.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Flat nav links */}
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={closeAll}
                className="px-3 py-2 rounded-lg text-sm transition-colors duration-200"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ── Desktop CTAs ── */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <a
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              Get started free
            </a>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-white p-2 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileOpen ? (
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              ) : (
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/[0.06] overflow-y-auto max-h-[calc(100vh-4rem)]"
          style={{ background: "rgba(5,5,10,0.97)" }}
        >
          <div className="px-4 py-5 flex flex-col gap-1">

            {/* Tools accordion */}
            <button
              type="button"
              onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/[0.04]"
            >
              <span>Tools</span>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="transition-transform duration-200"
                style={{ transform: mobileToolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {mobileToolsOpen && (
              <div className="mt-1 mb-1 ml-2 pl-3 border-l flex flex-col gap-0.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {TOOLS.map((tool) => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors hover:bg-white/[0.04]"
                  >
                    <span style={{ color: tool.color }}>{tool.icon}</span>
                    {tool.label}
                  </a>
                ))}
              </div>
            )}

            {/* Flat links */}
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors hover:bg-white/[0.04]"
              >
                {link.label}
              </a>
            ))}

            {/* Auth */}
            <div className="flex flex-col gap-2 mt-3 pt-4 border-t border-white/[0.06]">
              <a
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors border border-white/[0.08] hover:border-white/20"
              >
                Sign in
              </a>
              <a
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                Get started free
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown fade animation */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
