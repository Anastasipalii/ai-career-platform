export type ToneOption =
  | "Professional"
  | "Friendly"
  | "Confident"
  | "Formal"
  | "Creative";

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

export interface CoverLetterFormData {
  fullName: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeSummary: string;
  keySkills: string;
  tone: ToneOption;
  language: LanguageOption;
}

export const TONE_OPTIONS: ToneOption[] = [
  "Professional",
  "Friendly",
  "Confident",
  "Formal",
  "Creative",
];

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

export const TONE_DESCRIPTIONS: Record<ToneOption, string> = {
  Professional: "Clear, polished, business-appropriate",
  Friendly:     "Warm, approachable, conversational",
  Confident:    "Bold, assertive, results-focused",
  Formal:       "Structured, traditional, highly formal",
  Creative:     "Original, expressive, memorable",
};
