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
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  professionalLinks: ProfessionalLink[];
  customSections: CustomSection[];
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
  proficiency: "Native" | "Fluent" | "Conversational" | "Basic" | "";
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  url: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
}

export interface ProfessionalLink {
  id: string;
  label: string;
  url: string;
}

export interface CustomSectionItem {
  id: string;
  heading: string;
  subheading: string;
  date: string;
  description: string;
  url: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
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
