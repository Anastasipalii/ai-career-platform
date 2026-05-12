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
  // Visible in simplified form
  jobDescription: string;
  tone:           ToneOption;
  language:       LanguageOption;
  // Advanced / legacy (hidden from main form)
  fullName:       string;
  jobTitle:       string;
  company:        string;
  resumeSummary:  string;
  keySkills:      string;
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
