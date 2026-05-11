export interface ResumeFormData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  photoUrl: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: LanguageEntry[];
}

export const TRANSLATION_LANGUAGES = [
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
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Arabic",
  "Hindi",
  "Chinese",
  "Japanese",
  "Korean",
] as const;

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: "Native" | "Fluent" | "Conversational" | "Basic";
}

export type ColorTheme =
  | "Purple Neon"
  | "Navy Blue"
  | "Emerald Green"
  | "Burgundy"
  | "Black & White"
  | "Soft Beige"
  | "Minimal Gray";

export type FontOption =
  | "Minimal"
  | "Professional"
  | "Creative"
  | "ModernSans"
  | "Elegant";

export type LayoutOption =
  | "One-column"
  | "Two-column"
  | "Sidebar"
  | "Modern card";

export type SpacingOption = "Compact" | "Balanced" | "Spacious";

export type TemplateKey = "Minimal" | "Corporate" | "Creative" | "Modern Tech";

export interface CustomizationSettings {
  colorTheme: ColorTheme;
  font: FontOption;
  layout: LayoutOption;
  spacing: SpacingOption;
}

export const PROFICIENCY_LEVELS: LanguageEntry["proficiency"][] = [
  "Native",
  "Fluent",
  "Conversational",
  "Basic",
];
