// ============================================================================
// AI Workflow Studio — end-to-end pipeline (mock data)
// ----------------------------------------------------------------------------
// Presentation-only data for the visual career-automation workflow. No backend
// logic, no persistence — every value here is illustrative. The pipeline mirrors
// the real product surface (upload → analysis → ATS → matching → cover letter →
// interview → tracking → dashboard) so the canvas reads like a genuine product.
// ============================================================================

import type { DashboardEntity } from "./dashboardTargets";

export type WorkflowStepStatus = "waiting" | "running" | "completed";

export type FlowIconKey =
  | "upload"
  | "analysis"
  | "ats"
  | "matching"
  | "cover-letter"
  | "interview"
  | "tracking"
  | "dashboard";

export interface FlowMetaRow {
  label: string;
  value: string;
}

export interface FlowStep {
  id: string;
  index: number;
  title: string;
  /** Short subtitle shown under the title on the node. */
  short: string;
  /** Longer copy for the detail panel. */
  description: string;
  iconKey: FlowIconKey;
  /** Two-stop gradient for the icon badge and glow. */
  gradient: [string, string];
  /** Solid accent used for borders, text, and connector energy. */
  accent: string;
  /** Seed status used on first render and after Reset. */
  status: WorkflowStepStatus;
  /** Simulated execution time for this step, in milliseconds. */
  durationMs: number;
  /** Human-readable estimate shown in the detail panel, e.g. "2s". */
  estimatedTime: string;
  /** What the user does to trigger this step. */
  userAction: string;
  /** What the AI / automation does under the hood. */
  aiProcessing: string;
  /** The concrete outcome the user gets. */
  result: string;
  /** Technologies powering this step. */
  technologies: string[];
  /** Illustrative metadata rows for the detail panel. */
  meta: FlowMetaRow[];
  /** What this step produces. */
  outputs: string[];
  /** Where the output lands in the Dashboard (concept link, optional). */
  dashboardTarget?: DashboardEntity;
  /** Existing product route this step maps to (for the "Open tool" link). */
  route?: string;
}

export const FLOW_STEPS: FlowStep[] = [
  {
    id: "upload",
    index: 1,
    title: "Upload Resume",
    short: "PDF / DOCX intake",
    description:
      "The pipeline ingests your resume, parses it into structured sections, and extracts contact details, experience, and skills for downstream steps.",
    iconKey: "upload",
    gradient: ["#7c3aed", "#a855f7"],
    accent: "#a855f7",
    status: "waiting",
    durationMs: 1500,
    estimatedTime: "1.5s",
    userAction: "You drag in a PDF or DOCX resume, or pick one from your library.",
    aiProcessing:
      "A document parser splits the file into structured sections and extracts contact details, work history, and skills.",
    result: "A clean, structured profile that every downstream step can read.",
    technologies: ["Document AI", "PDF / DOCX parser", "Supabase Storage"],
    meta: [
      { label: "Source", value: "resume_2026.pdf" },
      { label: "Parser", value: "Document AI" },
      { label: "Duration", value: "1.2s" },
    ],
    outputs: ["Structured profile", "Raw text", "Detected sections"],
    route: "/resume-builder",
  },
  {
    id: "analysis",
    index: 2,
    title: "AI Resume Analysis",
    short: "Strengths & gaps",
    description:
      "An AI agent reviews tone, impact, and clarity — flagging weak bullet points, passive voice, and missing quantifiable outcomes, then proposes stronger rewrites.",
    iconKey: "analysis",
    gradient: ["#6366f1", "#06b6d4"],
    accent: "#22d3ee",
    status: "waiting",
    durationMs: 2000,
    estimatedTime: "2s",
    userAction: "You confirm the target role and seniority you're aiming for.",
    aiProcessing:
      "An LLM agent reviews tone, impact, and clarity — flagging weak bullets, passive voice, and missing metrics, then drafting stronger rewrites.",
    result: "Seven prioritized suggestions with before/after rewrites and an impact score.",
    technologies: ["GPT-4o-mini", "OpenAI API", "Prompt chaining"],
    meta: [
      { label: "Model", value: "gpt-4o-mini" },
      { label: "Findings", value: "7 suggestions" },
      { label: "Duration", value: "3.4s" },
    ],
    outputs: ["Rewrite suggestions", "Impact score", "Tone report"],
    dashboardTarget: "resume",
    route: "/resume-builder",
  },
  {
    id: "ats",
    index: 3,
    title: "ATS Optimization",
    short: "Beat the scanners",
    description:
      "Scores the resume for Applicant Tracking System compatibility, injects the keywords a target role expects, and verifies a clean, machine-readable structure.",
    iconKey: "ats",
    gradient: ["#06b6d4", "#14b8a6"],
    accent: "#06b6d4",
    status: "waiting",
    durationMs: 2000,
    estimatedTime: "2s",
    userAction: "You paste the job description you're targeting.",
    aiProcessing:
      "The resume is scored for ATS compatibility, the keywords the role expects are injected, and a clean machine-readable structure is verified.",
    result: "An ATS-optimized resume scoring 82/100 with a keyword coverage map.",
    technologies: ["Keyword extraction", "GPT-4o-mini", "ATS heuristics"],
    meta: [
      { label: "ATS score", value: "82 / 100" },
      { label: "Keywords", value: "+14 injected" },
      { label: "Duration", value: "2.1s" },
    ],
    outputs: ["Optimized resume", "Keyword map", "ATS score"],
    dashboardTarget: "resume",
    route: "/resume-builder",
  },
  {
    id: "matching",
    index: 4,
    title: "Job Matching",
    short: "Best-fit roles",
    description:
      "Ranks live job postings against the optimized profile, scoring each on skills overlap, seniority, and location to surface the roles where you're most competitive.",
    iconKey: "matching",
    gradient: ["#10b981", "#22c55e"],
    accent: "#10b981",
    status: "waiting",
    durationMs: 2000,
    estimatedTime: "2s",
    userAction: "You set preferences — location, seniority, and salary range.",
    aiProcessing:
      "Live job postings are embedded and ranked against your optimized profile on skills overlap, seniority, and location.",
    result: "A shortlist of 8 best-fit roles, with the top match at 94%.",
    technologies: ["Vector search", "Embeddings", "Ranking model"],
    meta: [
      { label: "Roles scanned", value: "1,240" },
      { label: "Top match", value: "94% fit" },
      { label: "Shortlist", value: "8 roles" },
    ],
    outputs: ["Ranked matches", "Fit scores", "Skills gap"],
    dashboardTarget: "job_match",
    route: "/job-match",
  },
  {
    id: "cover-letter",
    index: 5,
    title: "AI Cover Letter",
    short: "Tailored per role",
    description:
      "Generates a compelling, role-specific cover letter that adapts tone and narrative to each company and job description — no blank page, no boilerplate.",
    iconKey: "cover-letter",
    gradient: ["#f59e0b", "#f97316"],
    accent: "#f59e0b",
    status: "waiting",
    durationMs: 2000,
    estimatedTime: "2s",
    userAction: "You pick a role from your shortlist.",
    aiProcessing:
      "An LLM adapts tone and narrative to the specific company and job description, generating several ready-to-edit drafts.",
    result: "Three tailored cover-letter drafts with alternate opening hooks.",
    technologies: ["GPT-4o-mini", "Templating", "Tone control"],
    meta: [
      { label: "Model", value: "gpt-4o-mini" },
      { label: "Variants", value: "3 drafts" },
      { label: "Duration", value: "4.0s" },
    ],
    outputs: ["Cover letter", "Opening hooks", "Tone variants"],
    dashboardTarget: "cover_letter",
    route: "/cover-letter",
  },
  {
    id: "interview",
    index: 6,
    title: "Interview Preparation",
    short: "Mock & feedback",
    description:
      "Builds role-specific interview questions, runs a mock session, and returns structured feedback on your answers, structure, and delivery — iterating until you're ready.",
    iconKey: "interview",
    gradient: ["#ec4899", "#f43f5e"],
    accent: "#ec4899",
    status: "waiting",
    durationMs: 2000,
    estimatedTime: "2s",
    userAction: "You start a mock interview for the selected role.",
    aiProcessing:
      "Role-specific questions are generated, your answers are scored against a rubric, and structured feedback is returned.",
    result: "A 12-question bank plus per-answer feedback and a readiness score.",
    technologies: ["GPT-4o-mini", "Rubric scoring", "Speech-to-text"],
    meta: [
      { label: "Question set", value: "12 questions" },
      { label: "Focus", value: "Behavioral + system" },
      { label: "Score", value: "—" },
    ],
    outputs: ["Question bank", "Answer feedback", "Readiness score"],
    dashboardTarget: "interview_session",
    route: "/interview-coach",
  },
  {
    id: "tracking",
    index: 7,
    title: "Application Tracking",
    short: "Pipeline & follow-ups",
    description:
      "Logs every application as a task with stage, owner, and next action — nudging follow-ups so nothing slips between applied, interviewing, and offer.",
    iconKey: "tracking",
    gradient: ["#3b82f6", "#6366f1"],
    accent: "#3b82f6",
    status: "waiting",
    durationMs: 1500,
    estimatedTime: "1.5s",
    userAction: "You confirm you're applying to the role.",
    aiProcessing:
      "Your resume, cover letter, and prep are bundled into one application record with a stage and next action, and follow-ups are scheduled.",
    result: "A ready-to-send application package tracked in your pipeline.",
    technologies: ["Supabase", "Task engine", "Scheduler"],
    meta: [
      { label: "Applications", value: "8 tracked" },
      { label: "Stage", value: "3 interviewing" },
      { label: "Follow-ups", value: "2 due" },
    ],
    outputs: ["Application records", "Stage board", "Reminders"],
    dashboardTarget: "task",
  },
  {
    id: "dashboard",
    index: 8,
    title: "Dashboard",
    short: "Your workspace",
    description:
      "Every output flows back into your personal Dashboard — resumes, cover letters, job matches, interview sessions, and tasks — as a single source of truth.",
    iconKey: "dashboard",
    gradient: ["#7c3aed", "#06b6d4"],
    accent: "#a78bfa",
    status: "waiting",
    durationMs: 1000,
    estimatedTime: "1s",
    userAction: "Nothing — this step runs automatically.",
    aiProcessing:
      "Every output is written back and synced into your personal Dashboard widgets in real time.",
    result: "A unified workspace: resumes, cover letters, matches, sessions, and tasks in one place.",
    technologies: ["Supabase Realtime", "React", "Framer Motion"],
    meta: [
      { label: "Widgets", value: "6 live" },
      { label: "Synced items", value: "All outputs" },
      { label: "View", value: "Personal workspace" },
    ],
    outputs: ["Unified overview", "Recent activity", "Quick stats"],
    route: "/dashboard",
  },
];
