export type WorkType = "Remote" | "Hybrid" | "On-site";
export type EmploymentType = "Full-time" | "Part-time" | "Internship" | "Freelance";
export type SeniorityLevel = "Intern" | "Junior" | "Mid-level" | "Senior" | "Lead";

export interface JobPreferencesData {
  jobTitle: string;
  location: string;
  workType: WorkType;
  employmentType: EmploymentType;
  seniority: SeniorityLevel;
  language: string;
}

export interface JobMatch {
  id: number;
  title: string;
  company: string;
  location: string;
  workType: WorkType;
  employmentType: string;
  salaryRange: string;
  matchScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  postedDate: string;
}

/**
 * A REAL ranked job for display. Every identity field originates from the
 * external provider result (via /api/jobs/search → /api/job-match/agent) and is
 * never AI-generated. Optional fields are omitted by the UI when absent — never
 * substituted with invented salary/date/location values.
 */
export interface RankedJob {
  externalId: string;
  provider: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  /** Plain-text snippet from the provider description, "" when none. */
  description: string;
  jobTypes: string[];
  /** 0-100 ranking from the AI over the REAL job (identity never changes). */
  matchScore: number;
  whyMatch: string;
  missingSkills: string[];
  recommendedSkills: string[];
  /** Provider-supplied apply/source URLs; "" when the provider gave none. */
  applyUrl: string;
  sourceUrl: string;
  publishedAt: string | null;
}

export const WORK_TYPES: WorkType[] = ["Remote", "Hybrid", "On-site"];
export const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Internship", "Freelance"];
export const SENIORITY_LEVELS: SeniorityLevel[] = ["Intern", "Junior", "Mid-level", "Senior", "Lead"];

export const LANGUAGES: string[] = [
  "English (US)", "English (UK)", "German", "Ukrainian",
  "Russian", "Polish", "Spanish", "Italian", "French", "Portuguese", "Arabic",
];

/** @deprecated Demo-only sample data. NOT used by the live Job Match flow
 *  (which shows only real provider listings). Retained as dead sample data. */
export const MOCK_JOBS: JobMatch[] = [
  {
    id: 1,
    title: "Senior Product Designer",
    company: "Stripe",
    location: "San Francisco, CA",
    workType: "Remote",
    employmentType: "Full-time",
    salaryRange: "$150k – $195k",
    matchScore: 95,
    requiredSkills: ["Figma", "UX Research", "Design Systems", "Prototyping"],
    missingSkills: ["Motion Design"],
    postedDate: "2 days ago",
  },
  {
    id: 2,
    title: "Lead UX Designer",
    company: "Figma",
    location: "San Francisco, CA",
    workType: "Hybrid",
    employmentType: "Full-time",
    salaryRange: "$160k – $210k",
    matchScore: 88,
    requiredSkills: ["Figma", "Design Systems", "User Research", "Prototyping"],
    missingSkills: ["Figma Variables", "Dev Mode"],
    postedDate: "1 day ago",
  },
  {
    id: 3,
    title: "Product Design Lead",
    company: "Linear",
    location: "Remote",
    workType: "Remote",
    employmentType: "Full-time",
    salaryRange: "$140k – $185k",
    matchScore: 82,
    requiredSkills: ["Figma", "UX Research", "Design Systems"],
    missingSkills: ["TypeScript", "GraphQL"],
    postedDate: "3 days ago",
  },
  {
    id: 4,
    title: "Senior UX / UI Designer",
    company: "Notion",
    location: "New York, NY",
    workType: "Hybrid",
    employmentType: "Full-time",
    salaryRange: "$130k – $170k",
    matchScore: 78,
    requiredSkills: ["Figma", "UX Research", "Accessibility"],
    missingSkills: ["Motion Design", "React Native"],
    postedDate: "5 days ago",
  },
  {
    id: 5,
    title: "Principal Product Designer",
    company: "Anthropic",
    location: "San Francisco, CA",
    workType: "Hybrid",
    employmentType: "Full-time",
    salaryRange: "$180k – $240k",
    matchScore: 74,
    requiredSkills: ["Figma", "AI/ML Products", "Design Systems", "UX Research"],
    missingSkills: ["ML Product Design", "Prompt Engineering"],
    postedDate: "1 week ago",
  },
];

export function matchScoreColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 80) return "#8b5cf6";
  if (score >= 70) return "#06b6d4";
  return "#f59e0b";
}
