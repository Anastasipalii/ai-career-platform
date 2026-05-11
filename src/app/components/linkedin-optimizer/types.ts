export type LinkedInTone =
  | "Professional"
  | "Confident"
  | "Friendly"
  | "Executive"
  | "Creative"
  | "Minimal"
  | "Corporate";

export type CareerGoal =
  | "Job Search"
  | "Career Change"
  | "Relocation"
  | "Freelance"
  | "Remote Work"
  | "Executive Position"
  | "Tech Career"
  | "Creative Career";

export type LanguageOption =
  | "English (US)"
  | "English (UK)"
  | "German"
  | "Ukrainian"
  | "Russian"
  | "Polish"
  | "Spanish"
  | "Italian"
  | "Portuguese"
  | "French"
  | "Dutch"
  | "Greek"
  | "Turkish"
  | "Romanian"
  | "Czech"
  | "Albanian";

export interface LinkedInFormData {
  fullName: string;
  currentRole: string;
  headline: string;
  about: string;
  experience: string;
  skills: string;
  careerGoals: string;
  tone: LinkedInTone;
  goals: CareerGoal[];
  language: LanguageOption;
}

export const TONE_OPTIONS: LinkedInTone[] = [
  "Professional",
  "Confident",
  "Friendly",
  "Executive",
  "Creative",
  "Minimal",
  "Corporate",
];

export const TONE_META: Record<LinkedInTone, { color: string; bg: string; border: string; description: string }> = {
  Professional: { color: "#7c3aed", bg: "rgba(124,58,237,0.1)",  border: "rgba(124,58,237,0.25)", description: "Polished, clear, business-appropriate" },
  Confident:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", description: "Bold, assertive, results-driven" },
  Friendly:     { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.25)",  description: "Warm, approachable, human" },
  Executive:    { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", description: "Authoritative, strategic, senior" },
  Creative:     { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  border: "rgba(236,72,153,0.25)", description: "Original, expressive, memorable" },
  Minimal:      { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", description: "Concise, clean, no filler" },
  Corporate:    { color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)", description: "Formal, structured, traditional" },
};

export const CAREER_GOALS: CareerGoal[] = [
  "Job Search",
  "Career Change",
  "Relocation",
  "Freelance",
  "Remote Work",
  "Executive Position",
  "Tech Career",
  "Creative Career",
];

export const GOAL_META: Record<CareerGoal, { icon: string; color: string; bg: string }> = {
  "Job Search":         { icon: "🔍", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  "Career Change":      { icon: "🔄", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  "Relocation":         { icon: "✈️", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "Freelance":          { icon: "💼", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "Remote Work":        { icon: "🌐", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "Executive Position": { icon: "🏆", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  "Tech Career":        { icon: "⚙️", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  "Creative Career":    { icon: "🎨", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  "English (US)",
  "English (UK)",
  "German",
  "Ukrainian",
  "Russian",
  "Polish",
  "Spanish",
  "Italian",
  "Portuguese",
  "French",
  "Dutch",
  "Greek",
  "Turkish",
  "Romanian",
  "Czech",
  "Albanian",
];
