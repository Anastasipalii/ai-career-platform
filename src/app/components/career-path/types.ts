export type WorkStyle = "Remote" | "Hybrid" | "On-site";
export type ExperienceLevel = "Student" | "Junior" | "Mid-level" | "Senior" | "Lead";
export type TimeGoal = "3 months" | "6 months" | "12 months" | "24 months";

export interface CareerGoalData {
  currentTitle: string;
  targetTitle: string;
  industry: string;
  country: string;
  workStyle: WorkStyle;
  experience: ExperienceLevel;
  timeGoal: TimeGoal;
}

export interface RoadmapPhase {
  id: number;
  months: string;
  title: string;
  color: string;
  bg: string;
  tasks: string[];
}

export const WORK_STYLES: WorkStyle[] = ["Remote", "Hybrid", "On-site"];

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "Student", "Junior", "Mid-level", "Senior", "Lead",
];

export const TIME_GOALS: TimeGoal[] = [
  "3 months", "6 months", "12 months", "24 months",
];

export const INDUSTRIES: string[] = [
  "Technology", "Finance & Banking", "Healthcare", "Product & Design",
  "Marketing & Growth", "Sales", "Consulting", "Education",
  "E-Commerce", "AI & Machine Learning",
];

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: 1,
    months: "Month 1–3",
    title: "Foundation",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    tasks: [
      "Complete Motion Design fundamentals course",
      "Strengthen TypeScript and React basics",
      "Read 2 design leadership books",
      "Define your personal brand and niche",
      "Set up a public portfolio site",
    ],
  },
  {
    id: 2,
    months: "Month 4–6",
    title: "Portfolio & Skills",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    tasks: [
      "Redesign 2 case studies with quantified metrics",
      "Contribute to an open-source design system",
      "Earn one relevant certification",
      "Write 6 design essays to build thought leadership",
      "Build a Figma plugin or design tool",
    ],
  },
  {
    id: 3,
    months: "Month 7–9",
    title: "Applications & Networking",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    tasks: [
      "Apply to 15 target companies",
      "Reach out to 5 design leaders per week",
      "Attend 2 design conferences or meetups",
      "Get 3 informational interviews per month",
      "Optimise LinkedIn for inbound recruiter interest",
    ],
  },
  {
    id: 4,
    months: "Month 10–12",
    title: "Interviews & Offers",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    tasks: [
      "Practice 30 structured portfolio presentations",
      "Prepare 10 STAR-method stories",
      "Run mock interviews with senior designers",
      "Research salary ranges and prepare to negotiate",
      "Evaluate and sign your target offer",
    ],
  },
];
