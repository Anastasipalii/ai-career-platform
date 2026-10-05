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

export interface TranslationFormState {
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  fileName: string | null;
}
