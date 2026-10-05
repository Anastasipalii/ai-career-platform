// ============================================================================
// coverLetter/identity — deterministic, client-safe candidate identity
// extraction from résumé TEXT (Cover Letter Step 2).
// ----------------------------------------------------------------------------
// Pure and dependency-light: pulls name / email / phone / location out of
// résumé text the user uploaded (parsed entirely in the browser by
// parseResumeFile). It NEVER invents a value — when a field cannot be found
// with reasonable confidence it is returned empty for the user to fill in.
// These values only PREFILL visible, user-editable fields, so a miss is always
// correctable and nothing fabricated is sent to the model.
// ============================================================================

import { extractResumeLocation } from "@/lib/resume/extractLocation";

export interface CandidateIdentity {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

export const EMPTY_IDENTITY: CandidateIdentity = { fullName: "", email: "", phone: "", location: "" };

// First email address in the text.
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// A phone-shaped run of digits/separators. Validated afterwards by digit count
// so year ranges ("2019 - 2023") and similar are rejected.
const PHONE_RE = /\+?\d[\d\s()./-]{6,}\d/;

/** A résumé's first lines often carry the name. Accept only a short, mostly
 *  alphabetic 2–4 word line with no digits/@/section words — otherwise "". */
function looksLikeName(line: string): boolean {
  const s = line.trim();
  if (!s || s.length > 50) return false;
  if (/[@\d]/.test(s)) return false;
  if (/(resume|résumé|cv|curriculum|cover letter|vitae)/i.test(s)) return false;
  // Section headings are not names.
  if (/\b(summary|experience|education|skills|profile|objective|contact|projects|certifications|references|employment|work history|about)\b/i.test(s)) return false;
  // An all-caps line is heading-like, not a written name.
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*$/.test(w));
}

/**
 * Best-effort, never-fabricating extraction of candidate identity from résumé
 * text. Returns empty strings for anything not confidently found.
 */
export function extractCandidateIdentity(resumeText: string): CandidateIdentity {
  const text = (resumeText ?? "").replace(/\r/g, "");
  if (!text.trim()) return { ...EMPTY_IDENTITY };

  const email = text.match(EMAIL_RE)?.[0] ?? "";

  let phone = "";
  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) {
    const raw = phoneMatch[0].trim();
    const digits = raw.replace(/\D/g, "").length;
    // Real phone numbers carry 9–15 digits; this filters out year ranges, IDs,
    // and similar numeric runs.
    if (digits >= 9 && digits <= 15) phone = raw;
  }

  let fullName = "";
  for (const line of text.split("\n").slice(0, 8)) {
    if (looksLikeName(line)) { fullName = line.trim(); break; }
  }

  const loc = extractResumeLocation(text);
  const location = loc.confidence >= 0.5 ? loc.city : "";

  return { fullName, email, phone, location };
}
