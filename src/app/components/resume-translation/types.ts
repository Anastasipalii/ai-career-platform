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

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export interface TranslationOption {
  id: string;
  label: string;
  description: string;
}

export const TRANSLATION_OPTIONS: TranslationOption[] = [
  {
    id: "formatting",
    label: "Preserve professional formatting",
    description: "Section headers, bullet points, and layout stay intact",
  },
  {
    id: "ats",
    label: "Keep ATS-friendly structure",
    description: "Machine-readable format retained after translation",
  },
  {
    id: "tone",
    label: "Adapt tone for local job market",
    description: "Phrasing adjusted for cultural expectations in the target country",
  },
  {
    id: "titles",
    label: "Translate job titles naturally",
    description: "Titles localized to industry-standard equivalents, not literal",
  },
  {
    id: "dates",
    label: "Keep dates and contact details unchanged",
    description: "Phone numbers, emails, and dates remain in original format",
  },
];

export interface TranslationFormState {
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  enabledOptions: string[];
  fileName: string | null;
}
