import { ReactNode } from "react";

interface Tool {
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
  title: string;
  description: string;
  badge: string | null;
  href?: string;
}

const tools: Tool[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.2)",
    title: "Resume Builder AI",
    description:
      "Build an ATS-friendly resume with professional templates, color and font customization, and flexible layouts. AI rewrites your content per job description — export to PDF in one click.",
    badge: "Most popular",
    href: "/resume-builder",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
    title: "Interview Coach",
    description:
      "Practice with role-specific mock interviews powered by AI. Receive instant, detailed feedback on your answers, structure, and delivery — so every real interview feels rehearsed.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    title: "Job Match Engine",
    description:
      "AI scans thousands of live job postings daily and ranks the roles where your profile has the highest fit — filtered by salary, location, and seniority.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    title: "LinkedIn Optimizer",
    description:
      "Transform your LinkedIn profile with AI-written headlines, summaries, and bullet points that are crafted to increase recruiter visibility and profile views.",
    badge: null,
    href: "/linkedin-optimizer",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.2)",
    title: "Career Path Planner",
    description:
      "Get a personalized, step-by-step career roadmap based on your current skills and target role. Know exactly which skills to learn, roles to pursue, and milestones to hit.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
    title: "Cover Letter Generator",
    description:
      "Generate a compelling, personalized cover letter in one click. AI adapts the tone and narrative to the specific company and role — so you never start from a blank page.",
    badge: null,
    href: "/cover-letter",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    title: "Resume Translation",
    description:
      "Upload an existing resume or PDF and instantly translate it into 30+ languages. Professional formatting and tone are preserved — ready to send without any manual rework.",
    badge: null,
  },
];

export default function AITools() {
  return (
    <section id="features" className="py-24 relative">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(124,58,237,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-5">
            <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">
              AI toolkit
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Every tool you need to{" "}
            <span className="gradient-text">get hired faster</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Seven AI-powered tools working together — from first draft to signed offer letter.
          </p>
        </div>

        {/* Tools grid — 1 col → 2 col → 4 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="group relative rounded-2xl p-5 border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: "rgba(13,13,22,0.6)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${tool.bg} 0%, transparent 55%)`,
                }}
              />

              {/* Badge */}
              {tool.badge && (
                <div
                  className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: tool.bg, color: tool.color, border: `1px solid ${tool.border}` }}
                >
                  {tool.badge}
                </div>
              )}

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: tool.bg, color: tool.color, border: `1px solid ${tool.border}` }}
              >
                {tool.icon}
              </div>

              <h3 className="text-white font-semibold text-base mb-2 leading-snug">{tool.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{tool.description}</p>

              {/* Arrow */}
              {tool.href ? (
                <a
                  href={tool.href}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium w-fit"
                  style={{ color: tool.color }}
                >
                  Learn more
                  <svg
                    width="13" height="13" viewBox="0 0 13 13" fill="none"
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  >
                    <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : (
                <div
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: tool.color }}
                >
                  Learn more
                  <svg
                    width="13" height="13" viewBox="0 0 13 13" fill="none"
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  >
                    <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
