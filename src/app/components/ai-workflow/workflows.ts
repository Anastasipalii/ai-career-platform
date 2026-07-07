// ============================================================================
// AI Workflow module — seed registry
// ----------------------------------------------------------------------------
// A config-driven catalog of workflow definitions. Adding a new automation is
// purely additive: append an entry here (and later, its executor config). No
// component needs to change to render a new workflow.
//
// Phase 1: these definitions are display-only. `config` blocks describe the
// intended executor wiring (internal /api routes, n8n webhooks, Supabase)
// that later phases will actually run.
// ============================================================================

import type { WorkflowCategory, WorkflowDefinition } from "./types";

// Accent palette mirrors the per-tool color language already used across the
// app (see components/AITools.tsx and Navbar.tsx).
const ACCENT = {
  violet: { color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)" },
  cyan: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)" },
  amber: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  pink: { color: "#ec4899", bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.2)" },
  emerald: { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  indigo: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
} as const;

/** Human-readable labels for each category (used by filters and chips). */
export const CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  resume: "Resume",
  "job-search": "Job Search",
  outreach: "Outreach",
  interview: "Interview",
  research: "Research",
  automation: "Automation",
};

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "wf_tailored_application_kit",
    slug: "tailored-application-kit",
    name: "Tailored Application Kit",
    summary:
      "From a job description, an agent scores your resume for ATS fit, rewrites weak bullets, then drafts a matching cover letter — assembled into one ready-to-send kit.",
    category: "job-search",
    status: "available",
    trigger: { type: "manual" },
    accent: ACCENT.violet,
    estimatedRuntimeSec: 45,
    version: 1,
    tags: ["ATS", "resume", "cover letter"],
    steps: [
      {
        id: "ats",
        name: "Score resume vs. job",
        kind: "ai-agent",
        description: "Keyword-match the resume against the target job description.",
        config: { route: "/api/resume/tools", tool: "keyword_match" },
      },
      {
        id: "rewrite",
        name: "Rewrite weak sections",
        kind: "ai-agent",
        description: "Strengthen bullets flagged by the ATS step.",
        config: { route: "/api/resume/tools", tool: "rewriter" },
        dependsOn: ["ats"],
      },
      {
        id: "cover",
        name: "Draft cover letter",
        kind: "ai-agent",
        description: "Generate a tailored cover letter from the improved resume.",
        config: { route: "/api/cover-letter/generate" },
        dependsOn: ["rewrite"],
      },
      {
        id: "save",
        name: "Save to workspace",
        kind: "supabase",
        description: "Persist the kit to the user's account.",
        dependsOn: ["cover"],
      },
    ],
  },
  {
    id: "wf_daily_job_digest",
    slug: "daily-job-digest",
    name: "Daily Job Match Digest",
    summary:
      "Every morning, pull fresh postings via an n8n scraper, rank them against your profile, and email you the top matches with fit scores.",
    category: "automation",
    status: "coming-soon",
    trigger: { type: "schedule", config: { cron: "0 8 * * *" } },
    accent: ACCENT.cyan,
    estimatedRuntimeSec: 90,
    version: 1,
    tags: ["scheduled", "n8n", "email"],
    steps: [
      {
        id: "fetch",
        name: "Fetch new postings",
        kind: "n8n",
        description: "n8n workflow scrapes job boards and returns normalized listings.",
        config: { webhookUrl: "{{N8N_JOB_SCRAPER_WEBHOOK}}" },
      },
      {
        id: "rank",
        name: "Rank against profile",
        kind: "ai-agent",
        description: "Score each listing for fit using the job-match analyzer.",
        config: { route: "/api/job-match/analyze" },
        dependsOn: ["fetch"],
      },
      {
        id: "email",
        name: "Send digest",
        kind: "notify",
        description: "Email the top-ranked roles to the user.",
        dependsOn: ["rank"],
      },
    ],
  },
  {
    id: "wf_interview_prep_loop",
    slug: "interview-prep-loop",
    name: "Interview Prep Loop",
    summary:
      "Generate role-specific questions, capture your answers, and return structured feedback — iterating until you're interview-ready.",
    category: "interview",
    status: "beta",
    trigger: { type: "manual" },
    accent: ACCENT.amber,
    estimatedRuntimeSec: 60,
    version: 1,
    tags: ["mock interview", "feedback"],
    steps: [
      {
        id: "questions",
        name: "Generate questions",
        kind: "ai-agent",
        config: { route: "/api/interview/generate" },
      },
      {
        id: "feedback",
        name: "Evaluate answers",
        kind: "ai-agent",
        config: { route: "/api/interview/feedback" },
        dependsOn: ["questions"],
      },
      {
        id: "loop",
        name: "Decide: repeat or finish",
        kind: "condition",
        description: "Loop back if the score is below the target threshold.",
        dependsOn: ["feedback"],
      },
    ],
  },
  {
    id: "wf_linkedin_refresh",
    slug: "linkedin-refresh",
    name: "LinkedIn Profile Refresh",
    summary:
      "An agent rewrites your headline, About section, and top experience bullets for recruiter visibility, then packages the copy for one-click updating.",
    category: "outreach",
    status: "available",
    trigger: { type: "manual" },
    accent: ACCENT.pink,
    estimatedRuntimeSec: 30,
    version: 1,
    tags: ["LinkedIn", "personal brand"],
    steps: [
      {
        id: "optimize",
        name: "Optimize profile copy",
        kind: "ai-agent",
        config: { route: "/api/linkedin/optimize" },
      },
      {
        id: "polish",
        name: "Polish highlights",
        kind: "ai-agent",
        config: { route: "/api/linkedin/tools" },
        dependsOn: ["optimize"],
      },
    ],
  },
  {
    id: "wf_career_roadmap",
    slug: "career-roadmap",
    name: "Career Roadmap Builder",
    summary:
      "Analyze your current skills against a target role and produce a step-by-step roadmap of skills, milestones, and roles to pursue.",
    category: "research",
    status: "available",
    trigger: { type: "manual" },
    accent: ACCENT.emerald,
    estimatedRuntimeSec: 40,
    version: 1,
    tags: ["planning", "skills gap"],
    steps: [
      {
        id: "plan",
        name: "Generate roadmap",
        kind: "ai-agent",
        config: { route: "/api/career-path/generate" },
      },
      {
        id: "persist",
        name: "Save roadmap",
        kind: "supabase",
        dependsOn: ["plan"],
      },
    ],
  },
];

/** Lookup helper — returns a single definition by its slug. */
export function getWorkflowBySlug(slug: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((w) => w.slug === slug);
}

/** The distinct categories present in the registry, in a stable order. */
export function getWorkflowCategories(): WorkflowCategory[] {
  const order: WorkflowCategory[] = [
    "job-search",
    "automation",
    "interview",
    "outreach",
    "research",
    "resume",
  ];
  const present = new Set(WORKFLOWS.map((w) => w.category));
  return order.filter((c) => present.has(c));
}
