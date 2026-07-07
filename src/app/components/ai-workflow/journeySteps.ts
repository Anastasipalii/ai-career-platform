// ============================================================================
// AI Workflow Studio — step-by-step user journey (content)
// ----------------------------------------------------------------------------
// The narrative of a real CareerAI run, told from the user's point of view.
// For every step: what the user does, what the AI does behind the scenes, and
// what the user receives. Presentation-only content — no backend.
// ============================================================================

import type { FlowIconKey } from "./flowSteps";

export interface JourneyStep {
  index: number;
  iconKey: FlowIconKey;
  title: string;
  /** Short label of the AI capability powering this step. */
  aiTool: string;
  accent: string;
  gradient: [string, string];
  /** What the user does. */
  userAction: string;
  /** What the AI does behind the scenes. */
  aiProcessing: string;
  /** What the user receives. */
  result: string;
  /** Only used on the final Dashboard step. */
  dashboardItems?: string[];
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    index: 1,
    iconKey: "upload",
    title: "Upload Resume",
    aiTool: "Document parser",
    accent: "#a855f7",
    gradient: ["#7c3aed", "#a855f7"],
    userAction: "User uploads a PDF or DOCX resume.",
    aiProcessing:
      "AI extracts the text and identifies skills, work experience, education and languages.",
    result: "A structured candidate profile.",
  },
  {
    index: 2,
    iconKey: "analysis",
    title: "AI Resume Analysis",
    aiTool: "Resume analysis agent",
    accent: "#22d3ee",
    gradient: ["#6366f1", "#06b6d4"],
    userAction: "User reviews the feedback.",
    aiProcessing:
      "AI detects strengths, weaknesses, missing skills and an overall ATS score.",
    result: "Clear improvement recommendations.",
  },
  {
    index: 3,
    iconKey: "ats",
    title: "ATS Optimization",
    aiTool: "ATS optimizer",
    accent: "#06b6d4",
    gradient: ["#06b6d4", "#14b8a6"],
    userAction: "User accepts the suggestions.",
    aiProcessing: "AI rewrites sections and improves keywords and formatting.",
    result: "An ATS-optimized resume.",
  },
  {
    index: 4,
    iconKey: "matching",
    title: "Job Matching",
    aiTool: "Job match engine",
    accent: "#10b981",
    gradient: ["#10b981", "#22c55e"],
    userAction: "User selects preferences — role, location and seniority.",
    aiProcessing: "AI searches jobs and ranks opportunities by match percentage.",
    result: "Personalized job recommendations.",
  },
  {
    index: 5,
    iconKey: "cover-letter",
    title: "Cover Letter",
    aiTool: "Cover letter generator",
    accent: "#f59e0b",
    gradient: ["#f59e0b", "#f97316"],
    userAction: "User picks a target position.",
    aiProcessing:
      "AI generates a personalized cover letter tailored to each selected role.",
    result: "A ready-to-send cover letter.",
  },
  {
    index: 6,
    iconKey: "interview",
    title: "Interview Preparation",
    aiTool: "Interview coach",
    accent: "#ec4899",
    gradient: ["#ec4899", "#f43f5e"],
    userAction: "User practices with mock questions.",
    aiProcessing: "AI creates interview questions, evaluates answers and gives feedback.",
    result: "An interview score with recommendations.",
  },
  {
    index: 7,
    iconKey: "tracking",
    title: "Application Package",
    aiTool: "Package builder",
    accent: "#3b82f6",
    gradient: ["#3b82f6", "#6366f1"],
    userAction: "User confirms the roles to apply to.",
    aiProcessing: "AI assembles the resume, cover letter and full application package.",
    result: "A one-click application package.",
  },
  {
    index: 8,
    iconKey: "dashboard",
    title: "Dashboard",
    aiTool: "Auto-sync",
    accent: "#a78bfa",
    gradient: ["#7c3aed", "#06b6d4"],
    userAction: "User opens their personal workspace.",
    aiProcessing: "Everything is automatically stored and organized inside the Dashboard.",
    result: "A single source of truth for the whole job search.",
    dashboardItems: [
      "Resumes",
      "Cover letters",
      "Job matches",
      "Interview history",
      "Applications",
      "Tasks",
    ],
  },
];
