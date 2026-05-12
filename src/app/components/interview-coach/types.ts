// ── New simplified types ──────────────────────────────────────────────────────
export type InterviewMode = "quick" | "hr" | "technical" | "full";

export interface AIQuestion {
  question: string;
  category: string;
  tip:      string;
}

export interface SessionAnswer {
  question: AIQuestion;
  answer:   string;
  feedback: FeedbackData;
}

export interface SimpleSetupData {
  jobDescription: string;
  jobTitle:       string;
  mode:           InterviewMode;
  language:       InterviewLanguage;
}

export const MODE_LABELS: Record<InterviewMode, string> = {
  quick:     "Quick Practice",
  hr:        "HR Questions",
  technical: "Technical Questions",
  full:      "Full Simulation",
};

export const MODE_COUNTS: Record<InterviewMode, number> = {
  quick: 5, hr: 8, technical: 10, full: 12,
};

export const MODE_DURATIONS: Record<InterviewMode, string> = {
  quick: "~15 min", hr: "~20 min", technical: "~30 min", full: "~45 min",
};

// ── Legacy types (kept for backward compatibility) ────────────────────────────
export type SeniorityLevel =
  | "Intern"
  | "Junior"
  | "Mid-level"
  | "Senior"
  | "Lead"
  | "Manager";

export type InterviewType =
  | "HR Interview"
  | "Technical Interview"
  | "Behavioral Interview"
  | "Case Interview"
  | "Final Interview";

export type InterviewLanguage =
  | "English (US)"
  | "English (UK)"
  | "German"
  | "Ukrainian"
  | "Russian"
  | "Polish"
  | "Spanish"
  | "Italian"
  | "French"
  | "Portuguese";

export interface InterviewSetupData {
  jobTitle: string;
  industry: string;
  seniority: SeniorityLevel;
  interviewType: InterviewType;
  language: InterviewLanguage;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  color: string;
  tip: string;
}

export interface FeedbackData {
  clarity: number;
  confidence: number;
  structure: number;
  improvedAnswer: string;
  keywords: string[];
  mistakes: string[];
}

export const SENIORITY_LEVELS: SeniorityLevel[] = [
  "Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager",
];

export const INTERVIEW_TYPES: InterviewType[] = [
  "HR Interview",
  "Technical Interview",
  "Behavioral Interview",
  "Case Interview",
  "Final Interview",
];

export const INTERVIEW_LANGUAGES: InterviewLanguage[] = [
  "English (US)", "English (UK)", "German", "Ukrainian",
  "Russian", "Polish", "Spanish", "Italian", "French", "Portuguese",
];

export const INDUSTRIES: string[] = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Product & Design",
  "Marketing",
  "Sales",
  "Consulting",
  "Education",
  "E-Commerce",
  "Startup",
];

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    question: "Tell me about yourself.",
    category: "Opening",
    color: "#7c3aed",
    tip: "Use the Present–Past–Future formula: current role, key background, and why this opportunity excites you. Keep it under 2 minutes.",
  },
  {
    id: 2,
    question: "Why are you interested in this role?",
    category: "Motivation",
    color: "#06b6d4",
    tip: "Connect your skills and career goals to the company's mission. Reference something specific you researched about them.",
  },
  {
    id: 3,
    question: "Describe a challenge you overcame at work.",
    category: "Behavioral",
    color: "#f59e0b",
    tip: "Use STAR: Situation, Task, Action, Result. Quantify the impact — numbers make answers memorable.",
  },
  {
    id: 4,
    question: "What are your greatest strengths?",
    category: "Self-awareness",
    color: "#10b981",
    tip: "Pick 2–3 strengths directly relevant to this role. Back each with a specific, measurable example.",
  },
  {
    id: 5,
    question: "Why should we hire you?",
    category: "Closing",
    color: "#ec4899",
    tip: "Summarise your unique value: relevant skills, proven track record, and genuine enthusiasm for the company.",
  },
];

export const FEEDBACK_DATA: FeedbackData[] = [
  {
    clarity: 82, confidence: 75, structure: 88,
    improvedAnswer:
      "I'm a Senior Product Designer with 6 years of experience building AI-powered tools at scale. Most recently at Vercel, I led the redesign of the developer dashboard — improving onboarding by 40%. I'm genuinely excited about this role because it sits at the intersection of AI and design systems, which is exactly where my strengths and passion align.",
    keywords: ["design systems", "AI products", "cross-functional", "data-driven"],
    mistakes: ["Started with too much personal history", "Missing a clear future goal statement", "No company-specific research mentioned"],
  },
  {
    clarity: 78, confidence: 80, structure: 72,
    improvedAnswer:
      "I'm drawn to this role because it directly aligns with my 6 years in AI-driven product design. What excites me most is your focus on developer tooling — I've seen firsthand at Vercel how good UX in developer tools creates compounding value. I want to bring that same design philosophy here.",
    keywords: ["company mission", "role alignment", "specific product", "long-term impact"],
    mistakes: ["Answer was too generic", "Didn't reference the specific company", "Missing connection to personal career goals"],
  },
  {
    clarity: 90, confidence: 85, structure: 92,
    improvedAnswer:
      "At Vercel, we faced a significant drop in developer onboarding completion. I led a full audit of the signup flow, identified 3 critical drop-off points, and redesigned the progressive disclosure experience. The result: onboarding completion improved by 40% within 6 weeks — directly increasing paid conversions.",
    keywords: ["STAR method", "quantified results", "leadership", "problem-solving process"],
    mistakes: ["Chose a problem that was too minor", "Didn't clarify your contribution vs the team's", "Result was vague — always use a number"],
  },
  {
    clarity: 85, confidence: 78, structure: 80,
    improvedAnswer:
      "My greatest strength is translating ambiguity into scalable design systems. At Vercel, I built the company-wide design system from scratch — it now covers 12 product surfaces and reduced design-to-engineering handoff time by 60%. My second strength is user research: I run usability tests every sprint and use data to challenge assumptions.",
    keywords: ["specific strength", "measurable example", "relevant to role", "self-awareness"],
    mistakes: ["Used clichés like 'I'm a hard worker'", "No concrete example provided", "Mentioned weakness when only strengths were asked"],
  },
  {
    clarity: 88, confidence: 82, structure: 85,
    improvedAnswer:
      "You should hire me because I bring a rare combination of deep AI product experience and proven design leadership. In my last role I independently led a project impacting 1M+ users, improving a key metric by 34%. I understand engineering constraints, business goals, and user psychology — and I'm genuinely passionate about what you're building.",
    keywords: ["unique value proposition", "proven results", "enthusiasm", "cultural fit"],
    mistakes: ["Answer was too humble — underselling impact", "No specific reference to the company's product", "Didn't close with a confident statement"],
  },
];
