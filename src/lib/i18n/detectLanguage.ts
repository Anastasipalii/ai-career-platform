// ============================================================================
// i18n/detectLanguage — deterministic résumé language detection
// ----------------------------------------------------------------------------
// Determines the résumé's language from the résumé TEXT (and an optional
// user-selected override). Pure, offline, no LLM — so the output language is
// deterministic and never depends on provider job data. Used to pin the output
// language of every downstream LLM prompt (analysis, cover letter, interview).
// ============================================================================

export type SupportedLanguage =
  | "English" | "German" | "French" | "Spanish" | "Italian" | "Dutch" | "Polish" | "Portuguese";

const SUPPORTED: SupportedLanguage[] = [
  "English", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese",
];

// High-frequency function words per language (strong discriminators).
const STOPWORDS: Record<SupportedLanguage, string[]> = {
  English: ["the", "and", "of", "to", "in", "a", "is", "for", "with", "on", "as", "at", "by", "an", "this", "that", "are", "from", "will", "your", "you", "experience", "skills"],
  German: ["der", "die", "das", "und", "ist", "für", "mit", "den", "dem", "ein", "eine", "nicht", "auch", "sich", "oder", "im", "zu", "von", "werden", "wir", "bei", "aus", "durch", "als", "kenntnisse", "erfahrung"],
  French: ["le", "la", "les", "et", "des", "une", "un", "de", "du", "en", "dans", "pour", "avec", "est", "sur", "au", "aux", "que", "qui", "ne", "pas", "vous", "compétences", "expérience"],
  Spanish: ["el", "la", "los", "las", "de", "y", "en", "un", "una", "que", "con", "por", "para", "es", "del", "se", "su", "al", "como", "más", "experiencia", "habilidades"],
  Italian: ["il", "lo", "la", "di", "che", "per", "con", "un", "una", "del", "della", "non", "sono", "gli", "nel", "alla", "come", "più", "esperienza", "competenze"],
  Dutch: ["de", "het", "een", "en", "van", "is", "op", "met", "voor", "aan", "die", "dat", "niet", "zijn", "ook", "te", "bij", "door", "naar", "ervaring", "vaardigheden"],
  Polish: ["i", "w", "na", "z", "do", "nie", "że", "się", "to", "jest", "oraz", "dla", "przez", "jako", "przy", "po", "który", "doświadczenie", "umiejętności"],
  Portuguese: ["o", "a", "os", "as", "de", "da", "do", "e", "que", "em", "um", "uma", "para", "com", "por", "no", "na", "se", "experiência", "competências"],
};

// Diacritic hints that boost a specific language.
const DIACRITICS: { lang: SupportedLanguage; re: RegExp; weight: number }[] = [
  { lang: "German", re: /[äöüß]/i, weight: 4 },
  { lang: "Polish", re: /[ąęłżźśćń]/i, weight: 5 },
  { lang: "French", re: /[àâçèéêëîïôûù]/i, weight: 3 },
  { lang: "Spanish", re: /[ñ¡¿]/i, weight: 4 },
  { lang: "Portuguese", re: /[ãõ]/i, weight: 4 },
  { lang: "Italian", re: /[àèìòù]/i, weight: 1 },
];

/** Normalize an arbitrary user selection to a SupportedLanguage, or null. */
export function normalizeLanguage(input?: string | null): SupportedLanguage | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const map: Record<string, SupportedLanguage> = {
    en: "English", "english": "English", "english (us)": "English", "english (uk)": "English",
    de: "German", german: "German", deutsch: "German",
    fr: "French", french: "French", français: "French", francais: "French",
    es: "Spanish", spanish: "Spanish", español: "Spanish", espanol: "Spanish",
    it: "Italian", italian: "Italian", italiano: "Italian",
    nl: "Dutch", dutch: "Dutch", nederlands: "Dutch",
    pl: "Polish", polish: "Polish", polski: "Polish",
    pt: "Portuguese", portuguese: "Portuguese", português: "Portuguese", portugues: "Portuguese",
  };
  return map[s] ?? (SUPPORTED.find((l) => l.toLowerCase() === s) ?? null);
}

/**
 * Detect the résumé language. A valid user-selected language always wins.
 * Otherwise score the text by function-word frequency + diacritics. Defaults to
 * English when there is no clear signal.
 */
export function detectResumeLanguage(text: string, userSelected?: string | null): SupportedLanguage {
  const forced = normalizeLanguage(userSelected);
  if (forced) return forced;

  const tokens = (text || "").toLowerCase().split(/[^a-zà-ÿąęłżźśćń]+/i).filter(Boolean);
  if (tokens.length < 8) return "English"; // too little signal
  const tokenSet = new Set(tokens);

  const scores = new Map<SupportedLanguage, number>();
  for (const lang of SUPPORTED) {
    let score = 0;
    for (const w of STOPWORDS[lang]) if (tokenSet.has(w)) score += 1;
    scores.set(lang, score);
  }
  for (const d of DIACRITICS) {
    if (d.re.test(text)) scores.set(d.lang, (scores.get(d.lang) ?? 0) + d.weight);
  }

  let best: SupportedLanguage = "English";
  let bestScore = scores.get("English") ?? 0;
  for (const lang of SUPPORTED) {
    const s = scores.get(lang) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = lang;
    }
  }
  // Require a minimal signal to move off the English default.
  return bestScore >= 2 ? best : "English";
}
