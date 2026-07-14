"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkAdminAccess } from "@/lib/simulation/adminAccess";
import {
  FileText, Mail, Network, Languages, Mic,
  Search, TrendingUp, ChevronDown, Menu, X, ShieldCheck, Activity,
} from "lucide-react";

interface Tool {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const TOOLS: Tool[] = [
  {
    label: "Resume Builder",
    href: "/resume-builder",
    description: "ATS-optimized resumes in minutes",
    icon: <FileText size={16} />,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.12)",
  },
  {
    label: "Cover Letter Generator",
    href: "/cover-letter",
    description: "Personalised letters for every role",
    icon: <Mail size={16} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
  },
  {
    label: "LinkedIn Optimizer",
    href: "/linkedin-optimizer",
    description: "AI-written headlines that get noticed",
    icon: <Network size={16} />,
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.12)",
  },
  {
    label: "Resume Translation",
    href: "/resume-translation",
    description: "Translate into 25+ languages instantly",
    icon: <Languages size={16} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
  },
  {
    label: "Interview Coach",
    href: "/interview-coach",
    description: "AI mock interviews with real feedback",
    icon: <Mic size={16} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  {
    label: "Job Match Engine",
    href: "/job-match",
    description: "Find roles where you're most competitive",
    icon: <Search size={16} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
  },
  {
    label: "Career Path Planner",
    href: "/career-path",
    description: "Step-by-step roadmap to your next role",
    icon: <TrendingUp size={16} />,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
  },
];

type NavLink =
  | { label: string; type: "anchor"; id: string }
  | { label: string; type: "page"; href: string };

const NAV_LINKS: NavLink[] = [
  { label: "Features",  type: "anchor", id: "features" },
  { label: "Workflow",  type: "page",   href: "/ai-workflow" },
  { label: "Pricing",   type: "anchor", id: "pricing" },
  { label: "About",     type: "anchor", id: "about" },
  { label: "Dashboard", type: "page",   href: "/dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen]           = useState(false);
  const [toolsOpen, setToolsOpen]             = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth state: null = still checking, true/false = resolved. Read the current
  // Supabase session on mount and stay in sync with sign-in / sign-out events.
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Admin flag drives the (hidden-by-default) admin nav entry. Verified against
  // the DB (app_admins under RLS) — non-admins/logged-out users never see it.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => { if (active) setAuthed(!!data.session); })
      .catch(() => { if (active) setAuthed(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Resolve admin status whenever the session changes (fail closed). State is
  // updated asynchronously so we never call setState synchronously in an effect.
  useEffect(() => {
    let active = true;
    if (authed !== true) {
      Promise.resolve().then(() => { if (active) setIsAdmin(false); });
      return () => { active = false; };
    }
    checkAdminAccess()
      .then((a) => { if (active) setIsAdmin(a.isAdmin); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [authed]);

  const handleLogout = async () => {
    closeAll();
    await supabase.auth.signOut(); // onAuthStateChange updates the header immediately
  };

  const closeAll = () => {
    setMobileOpen(false);
    setToolsOpen(false);
  };

  const handleAnchorNav = (id: string) => {
    closeAll();
    if (pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.assign(`/#${id}`);
    }
  };

  const linkCls = "px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors duration-150";
  const mobileLinkCls = "px-3.5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-150";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{ background: "rgba(5,5,10,0.88)", backdropFilter: "blur(24px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="2.5" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-[17px] tracking-tight">CareerAI</span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1 flex-1">

            {/* Tools dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                className="group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ color: toolsOpen ? "#e2e8f0" : "#94a3b8" }}
              >
                Tools
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>

              {toolsOpen && (
                <div
                  className="absolute top-full left-0 mt-2.5 w-[540px] rounded-2xl border p-3"
                  style={{
                    background: "rgba(8,8,14,0.97)",
                    borderColor: "rgba(255,255,255,0.09)",
                    backdropFilter: "blur(28px)",
                    boxShadow: "0 20px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.07)",
                    animation: "dropIn 0.14s ease",
                  }}
                >
                  <div className="flex items-center gap-2 px-3 pb-2.5 mb-1 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">AI Tools</span>
                  </div>

                  <div className="grid grid-cols-2 gap-0.5">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={closeAll}
                        className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-150 group/item"
                        style={{ color: "inherit" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 group-hover/item:scale-110"
                          style={{ background: tool.bg, color: tool.color }}
                        >
                          {tool.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white leading-snug">{tool.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">{tool.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flat links */}
            {NAV_LINKS.map((link) =>
              link.type === "anchor" ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleAnchorNav(link.id)}
                  className={linkCls}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeAll}
                  className={linkCls}
                >
                  {link.label}
                </Link>
              )
            )}

            {/* Admin-only entries (hidden unless the DB confirms admin) */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/simulation"
                  onClick={closeAll}
                  className={linkCls + " inline-flex items-center gap-1.5"}
                >
                  <ShieldCheck size={14} className="text-emerald-400" /> Admin
                </Link>
                <Link
                  href="/admin/monitoring"
                  onClick={closeAll}
                  className={linkCls + " inline-flex items-center gap-1.5"}
                >
                  <Activity size={14} className="text-cyan-400" /> Monitoring
                </Link>
              </>
            )}
          </nav>

          {/* ── Desktop CTAs ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
            {authed === null ? null : authed ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                Log out
              </button>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                >
                  Get started free
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            className="md:hidden ml-auto text-slate-400 hover:text-white p-2 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/[0.06] overflow-y-auto max-h-[calc(100svh-4rem)]"
          style={{ background: "rgba(5,5,10,0.97)" }}
        >
          <div className="px-4 py-5 flex flex-col gap-0.5">

            {/* Tools accordion */}
            <button
              type="button"
              onClick={() => setMobileToolsOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
            >
              Tools
              <ChevronDown
                size={15}
                className="transition-transform duration-200"
                style={{ transform: mobileToolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {mobileToolsOpen && (
              <div
                className="mt-1 mb-2 ml-3 pl-3.5 border-l flex flex-col gap-0.5"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={closeAll}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
                  >
                    <span style={{ color: tool.color }}>{tool.icon}</span>
                    {tool.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile nav links */}
            {NAV_LINKS.map((link) =>
              link.type === "anchor" ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleAnchorNav(link.id)}
                  className={mobileLinkCls + " text-left w-full"}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeAll}
                  className={mobileLinkCls}
                >
                  {link.label}
                </Link>
              )
            )}

            {isAdmin && (
              <>
                <Link
                  href="/admin/simulation"
                  onClick={closeAll}
                  className={mobileLinkCls + " inline-flex items-center gap-2"}
                >
                  <ShieldCheck size={15} className="text-emerald-400" /> Admin
                </Link>
                <Link
                  href="/admin/monitoring"
                  onClick={closeAll}
                  className={mobileLinkCls + " inline-flex items-center gap-2"}
                >
                  <Activity size={15} className="text-cyan-400" /> Monitoring
                </Link>
              </>
            )}

            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/[0.06]">
              {authed === null ? null : authed ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeAll}
                    className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-white/[0.09] hover:border-white/20 hover:text-white transition-all"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={closeAll}
                    className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                  >
                    Get started free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </header>
  );
}
