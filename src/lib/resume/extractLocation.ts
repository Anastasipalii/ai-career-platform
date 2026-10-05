// ============================================================================
// resume/extractLocation — deterministic résumé location extraction
// ----------------------------------------------------------------------------
// Pure, best-effort, NEVER invents a location. Returns a confidence so the UI
// can prefill Search Preferences only when the signal is reliable. Runs on the
// client over the résumé text already in memory; the text is never logged.
// Focused on common German patterns (the primary user base) plus a few generic
// "City, Country" cases; unrecognised résumés yield confidence 0.
// ============================================================================

import { resolveCountry } from "@/lib/jobs/location";

export interface ExtractedLocation {
  city: string;
  country: string; // "DE" | "US" | … | ""
  /** 0 (nothing) … 1 (strong signal). The UI prefills only above ~0.5. */
  confidence: number;
}

const KNOWN_CITIES: Record<string, string> = {
  "düsseldorf": "DE", "dusseldorf": "DE", "duesseldorf": "DE", "köln": "DE", "koln": "DE", "cologne": "DE",
  "berlin": "DE", "münchen": "DE", "munchen": "DE", "munich": "DE", "hamburg": "DE", "frankfurt": "DE",
  "stuttgart": "DE", "dortmund": "DE", "essen": "DE", "hannover": "DE", "hanover": "DE", "leipzig": "DE",
  "dresden": "DE", "bonn": "DE", "mannheim": "DE", "karlsruhe": "DE", "münster": "DE", "munster": "DE", "aachen": "DE",
};

const COUNTRY_WORDS = "(germany|deutschland|united states|usa|u\\.s\\.a?\\.?|netherlands|nederland|france|austria|österreich|united kingdom|uk|england)";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Extract a candidate location from résumé text. Never fabricates. */
export function extractResumeLocation(resumeText: string): ExtractedLocation {
  const text = (resumeText ?? "").slice(0, 8000);
  if (!text.trim()) return { city: "", country: "", confidence: 0 };
  const lower = text.toLowerCase();

  // 1) "City, Country" — strongest deterministic signal.
  const cc = text.match(new RegExp(`([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.'\\-]{2,30})\\s*,\\s*${COUNTRY_WORDS}`, "i"));
  if (cc) {
    const city = cc[1].trim();
    const country = resolveCountry(cc[2]);
    if (country) return { city, country, confidence: 0.9 };
  }

  // 2) German postal code + city (e.g. "40210 Düsseldorf").
  const pc = lower.match(/\b\d{5}\s+([a-zäöüß][a-zäöüß.\-]{2,})\b/);
  if (pc) {
    const city = pc[1];
    const country = KNOWN_CITIES[city] ?? "DE"; // 5-digit + city word → German pattern
    return { city: titleCase(city), country, confidence: KNOWN_CITIES[city] ? 0.85 : 0.6 };
  }

  // 3) A known city token on its own.
  for (const [city, country] of Object.entries(KNOWN_CITIES)) {
    if (new RegExp(`\\b${city}\\b`, "i").test(lower)) {
      return { city: titleCase(city), country, confidence: 0.55 };
    }
  }

  // 4) Only a country name — low confidence, no city (never guessed).
  const country = resolveCountry(text);
  if (country) return { city: "", country, confidence: 0.3 };

  return { city: "", country: "", confidence: 0 };
}
