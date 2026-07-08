// ============================================================================
// promptLanguage — shared output-language instructions for the AI workflow
// ----------------------------------------------------------------------------
// Centralizes the language-detection rules used by every AI route so the ATS
// analysis, job matches, cover letter and interview questions are all produced
// in the SAME language as the candidate's material. It only affects the natural
// -language VALUES the model writes — JSON keys and fixed enumerated tokens stay
// in English, so the response schema and all downstream parsing are unchanged.
// ============================================================================

/** For routes that receive the resume (and optionally a job description). */
export const LANGUAGE_RULE_RESUME =
  "LANGUAGE: Detect the primary language of the candidate's RESUME. If a JOB DESCRIPTION is also " +
  "provided and it is written in a different language, use the JOB DESCRIPTION's language instead. " +
  "Write every natural-language field VALUE (summaries, reasons, descriptions, recommendations, and " +
  "free text) in that detected language. Support English, German, French, Spanish, Italian, Dutch, " +
  "Polish and other Latin-alphabet languages. Do NOT translate the content into any other language " +
  "unless the user explicitly asks. Keep all JSON keys exactly as specified in English, keep fixed " +
  "enumerated tokens (e.g. seniority levels such as Junior/Mid-level/Senior/Lead/Executive) in " +
  "English, and do not add, remove or rename any fields — return the exact same JSON structure.";

/** For the interview route, which only receives role/job-description context. */
export const LANGUAGE_RULE_INTERVIEW =
  "LANGUAGE: Detect the language of the provided role and job-description context and write every " +
  "question and tip in that language (English, German, French, Spanish, Italian, Dutch, Polish or " +
  "other Latin-alphabet languages). If the language is ambiguous, use the requested language passed " +
  "in the prompt. Never translate unless the user explicitly asks. Keep all JSON keys in English and " +
  "keep the category values in English; do not change the JSON structure.";
