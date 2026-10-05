export type ToneOption =
  | "Professional"
  | "Friendly"
  | "Confident";

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
  | "Albanian"
  | "Arabic";

export interface CoverLetterFormData {
  // Job + style
  jobDescription: string;
  tone:           ToneOption;
  language:       LanguageOption;
  // Real candidate identity — user-reviewed, prefilled from the résumé where
  // confidently found. Never fabricated; blank when unknown.
  fullName:       string;
  email:          string;
  phone:          string;
  location:       string;
  jobTitle:       string; // target role the candidate is applying for
  company:        string;
  // Extracted résumé text (parsed client-side) — the factual background sent to
  // the generator. Raw file bytes never leave the browser.
  resumeText:     string;
}

export const TONE_OPTIONS: ToneOption[] = [
  "Professional",
  "Friendly",
  "Confident",
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
  "Arabic",
];

export const TONE_DESCRIPTIONS: Record<ToneOption, string> = {
  Professional: "Clear, polished, business-appropriate",
  Friendly:     "Warm, approachable, conversational",
  Confident:    "Bold, assertive, results-focused",
};
