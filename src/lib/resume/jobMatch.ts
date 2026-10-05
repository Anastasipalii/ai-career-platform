// ============================================================================
// resume/jobMatch — DETERMINISTIC job-description matching.
//
// Given structured job requirements and a résumé, computes an explainable
// "Job Match" (0–100): how well the résumé's content matches the requirements
// found in THIS job description. It is NOT a hiring-probability or ATS-pass
// prediction. Matching is deterministic (no OpenAI, no randomness) and read-only
// — it never mutates ResumeFormData.
//
// Requirements can come from AI extraction (validated by validateRequirements)
// or from deterministic local extraction (extractRequirementsLocally). Either
// way the SAME deterministic matcher runs. A missing keyword is reported, never
// auto-inserted into the résumé.
//
// Match rubric (weights apply only to categories that actually have terms; the
// overall is their weighted mean, normalised to 100):
//   Required skills      50
//   Preferred skills     15
//   Role / title         15
//   Important keywords   20
// ============================================================================

import type { ResumeFormData } from "@/app/components/resume-builder/types";

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  importantKeywords: string[];
  roleTitle: string;
}

export type EvidenceField = "Skills" | "Experience" | "Summary" | "Title" | "Education" | "Projects" | "Certifications" | "Custom sections" | null;

export interface RequirementMatch {
  term: string;
  matched: boolean;
  evidence: EvidenceField;
}

export interface MatchCategory {
  key: string;
  label: string;
  weight: number;
  subScore: number; // 0..100 match rate for this category
  matches: RequirementMatch[];
}

export interface JobMatchResult {
  overall: number; // 0..100
  categories: MatchCategory[];
  missingRequired: string[];
  missingPreferred: string[];
  missingKeywords: string[];
}

export const MIN_JOB_DESCRIPTION_CHARS = 120;

// ── Normalisation ────────────────────────────────────────────────────────────
/** Lower-case, trim, collapse whitespace, strip surrounding punctuation. */
export function normalizeTerm(term: string): string {
  return (term || "")
    .toLowerCase()
    .replace(/[‘’'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,;:/-]+|[.,;:/-]+$/g, "")
    .trim();
}

/** Conservative safe variants of a term. Never maps unrelated concepts together. */
export function termVariants(term: string): string[] {
  const base = normalizeTerm(term);
  const out = new Set<string>();
  if (!base) return [];
  out.add(base);
  // "react.js" / "reactjs" / "react js" → "react"; likewise node/vue/next/express.
  const deJs = base.replace(/\.?js\b/g, "").replace(/\s+/g, " ").trim();
  if (deJs && deJs !== base) out.add(deJs);
  // Remove internal dots ("node.js" → "nodejs", "d3.js" → "d3js") as a variant.
  const noDots = base.replace(/\./g, "");
  if (noDots && noDots !== base) out.add(noDots);
  // "type script" ↔ "typescript" style: also add the spaced form's joined variant.
  const joined = base.replace(/\s+/g, "");
  if (joined && joined !== base && joined.length > 2) out.add(joined);
  return [...out].filter(Boolean);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word / phrase containment, tolerant of trailing +/# (c++, c#). */
export function containsTerm(haystack: string, term: string): boolean {
  const hay = ` ${normalizeTerm(haystack).replace(/[‘’'"()]/g, "")} `;
  for (const v of termVariants(term)) {
    if (!v) continue;
    const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(v)}(?![a-z0-9])`);
    if (re.test(hay)) return true;
  }
  return false;
}

// ── Stop words for local keyword extraction ─────────────────────────────────
const STOP_WORDS = new Set([
  "the","and","for","with","you","your","our","are","will","have","has","that",
  "this","from","they","their","them","who","what","when","which","would","should",
  "must","able","work","working","team","teams","role","job","position","company",
  "years","year","experience","strong","good","great","excellent","ability","skills",
  "skill","knowledge","understanding","including","etc","using","use","used","plus",
  "well","other","across","within","into","about","also","more","most","some","any",
  "all","new","help","join","looking","seeking","ideal","candidate","candidates",
  "responsibilities","requirements","required","preferred","qualifications","nice",
  "bonus","world","people","day","time","need","needs","want","like","make","building",
  "a","an","in","on","of","to","or","as","at","is","be","we","us","by","it","its","per",
]);

// ── Deterministic local requirement extraction (no AI, no fabrication) ────────
/**
 * Extracts requirement terms from the real job-description text. Terms are only
 * ever drawn FROM the text — nothing is invented. Required/preferred are split
 * only on explicit section cues; otherwise terms are treated as general
 * importantKeywords (preserving uncertainty rather than over-claiming "required").
 */
export function extractRequirementsLocally(jobText: string, roleTitle = ""): JobRequirements {
  const text = jobText || "";
  const lines = text.split(/\r?\n/);

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  let mode: "required" | "preferred" | "none" = "none";

  const pushUnique = (arr: string[], t: string) => {
    const n = normalizeTerm(t);
    if (n && n.length >= 2 && !arr.some((x) => normalizeTerm(x) === n)) arr.push(t.trim());
  };

  for (const raw of lines) {
    const line = raw.trim();
    const low = line.toLowerCase();
    if (/(^|\b)(nice to have|preferred|bonus|a plus|desirable)\b/.test(low)) mode = "preferred";
    else if (/(^|\b)(requirements?|must have|required|qualifications|what you.?ll need)\b/.test(low)) mode = "required";
    // Bulleted skill-ish lines feed the required/preferred buckets.
    if (/^[•\-*]/.test(line) && mode !== "none") {
      const item = line.replace(/^[•\-*]\s*/, "");
      // Keep short, skill-like fragments (avoid whole sentences).
      if (item && item.split(/\s+/).length <= 6) {
        pushUnique(mode === "preferred" ? preferredSkills : requiredSkills, item);
      }
    }
  }

  // Important keywords: distinct meaningful tokens present in the JD.
  const importantKeywords = extractJobKeywords(text, 20);

  return { requiredSkills, preferredSkills, importantKeywords, roleTitle: roleTitle.trim() };
}

/**
 * Distinct meaningful terms actually present in the job text, most frequent first.
 * Stop words removed; nothing invented. Shared by local extraction and the
 * degraded "basic text match" path.
 */
export function extractJobKeywords(jobText: string, limit = 20): string[] {
  const freq = new Map<string, number>();
  for (const w of (jobText || "").toLowerCase().match(/[a-z][a-z0-9+#.]{1,}/g) || []) {
    const t = w.replace(/^[.]+|[.]+$/g, "");
    if (t.length < 3 || STOP_WORDS.has(t)) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

// ── Validation for AI-extracted requirements ─────────────────────────────────
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())))
    : [];

/**
 * Validates/normalises a raw AI extraction response. Returns null when the shape
 * is unusable (caller must then reject it — NO fabricated fallback). Never
 * invents terms; only keeps strings the model actually returned.
 */
export function validateRequirements(raw: unknown): JobRequirements | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const required = asStringArray(o.requiredSkills);
  const preferred = asStringArray(o.preferredSkills);
  const keywords = asStringArray(o.importantKeywords);
  const roleTitle = typeof o.roleTitle === "string" ? o.roleTitle.trim() : "";
  // Unusable if the model returned no requirement signal at all.
  if (required.length === 0 && preferred.length === 0 && keywords.length === 0) return null;
  // A term listed as both is treated as required only (never upgrade preferred→required silently,
  // but a duplicate that IS required stays required and is removed from preferred).
  const reqSet = new Set(required.map(normalizeTerm));
  const preferredClean = preferred.filter((p) => !reqSet.has(normalizeTerm(p)));
  return { requiredSkills: required, preferredSkills: preferredClean, importantKeywords: keywords, roleTitle };
}

// ── Matching ─────────────────────────────────────────────────────────────────
interface FieldText { field: EvidenceField; text: string }

function resumeFields(resume: ResumeFormData): FieldText[] {
  const exp = (resume.experience || [])
    .map((e) => `${e.role} ${e.company} ${e.description}`)
    .join("  ");
  const edu = (resume.education || [])
    .map((e) => `${e.degree} ${e.field} ${e.institution}`)
    .join("  ");
  const proj = (resume.projects || [])
    .map((p) => `${p.name} ${p.role} ${p.description}`)
    .join("  ");
  const certs = (resume.certifications || [])
    .map((c) => `${c.name} ${c.issuer}`)
    .join("  ");
  // Custom-section ITEM text (heading/subheading/description) can be evidence for
  // terms explicitly written there. Section TITLES and professional-link URLs are
  // intentionally excluded — a title or a GitHub URL must not imply a skill.
  const custom = (resume.customSections || [])
    .flatMap((sec) => (sec.items || []).map((i) => `${i.heading} ${i.subheading} ${i.description}`))
    .join("  ");
  return [
    { field: "Skills", text: (resume.skills || []).join("  ") },
    { field: "Experience", text: exp },
    { field: "Projects", text: proj },
    { field: "Summary", text: resume.summary || "" },
    { field: "Title", text: resume.jobTitle || "" },
    { field: "Education", text: edu },
    { field: "Certifications", text: certs },
    { field: "Custom sections", text: custom },
  ];
}

function matchTerm(fields: FieldText[], term: string): RequirementMatch {
  for (const f of fields) {
    if (f.text && containsTerm(f.text, term)) {
      return { term, matched: true, evidence: f.field };
    }
  }
  return { term, matched: false, evidence: null };
}

function rate(matches: RequirementMatch[]): number {
  if (matches.length === 0) return 0;
  return Math.round((matches.filter((m) => m.matched).length / matches.length) * 100);
}

/** Deterministic match. Read-only: never mutates `resume`. */
export function matchResumeToJob(resume: ResumeFormData, req: JobRequirements): JobMatchResult {
  const fields = resumeFields(resume);

  const requiredMatches = req.requiredSkills.map((t) => matchTerm(fields, t));
  const preferredMatches = req.preferredSkills.map((t) => matchTerm(fields, t));
  const titleMatches = req.roleTitle
    ? [matchTerm(fields, req.roleTitle)]
    : [];
  // Keyword category: dedupe against required/preferred so it isn't double counted.
  const covered = new Set(
    [...req.requiredSkills, ...req.preferredSkills].map(normalizeTerm)
  );
  const keywordTerms = req.importantKeywords.filter((k) => !covered.has(normalizeTerm(k)));
  const keywordMatches = keywordTerms.map((t) => matchTerm(fields, t));

  const categories: MatchCategory[] = [
    { key: "required", label: "Required skills", weight: 50, subScore: rate(requiredMatches), matches: requiredMatches },
    { key: "preferred", label: "Preferred skills", weight: 15, subScore: rate(preferredMatches), matches: preferredMatches },
    { key: "title", label: "Role / title relevance", weight: 15, subScore: rate(titleMatches), matches: titleMatches },
    { key: "keywords", label: "Important keywords", weight: 20, subScore: rate(keywordMatches), matches: keywordMatches },
  ];

  // Overall = weighted mean over categories that actually have terms.
  const active = categories.filter((c) => c.matches.length > 0);
  const totalWeight = active.reduce((s, c) => s + c.weight, 0);
  const overall = totalWeight === 0
    ? 0
    : Math.round(active.reduce((s, c) => s + c.weight * c.subScore, 0) / totalWeight);

  const missing = (ms: RequirementMatch[]) => ms.filter((m) => !m.matched).map((m) => m.term);

  return {
    overall,
    categories,
    missingRequired: missing(requiredMatches),
    missingPreferred: missing(preferredMatches),
    missingKeywords: missing(keywordMatches),
  };
}

// ── Degraded "Basic text match" (used only when AI extraction is unavailable) ──
// A deliberately DIFFERENT, lower-confidence analysis. It does NOT classify
// requirements as required/preferred (we cannot know that without extraction);
// it only reports lexical coverage: which meaningful terms from the job text
// also appear in the résumé. Its number is "term coverage", NOT the full
// Job Match score, and the two must never be presented as equivalent.

export interface BasicMatchTerm {
  term: string;
  matched: boolean;
  evidence: EvidenceField;
}

export interface BasicTextMatchResult {
  mode: "basic";
  /** % of extracted job terms found in the résumé. A coverage figure, NOT the
   *  full Job Match rubric score. */
  coverage: number;
  matchedCount: number;
  totalCount: number;
  terms: BasicMatchTerm[];
}

/** Minimum meaningful terms needed for a basic comparison to be worth showing. */
export const MIN_BASIC_TERMS = 5;

/**
 * Deterministic lexical coverage of the real job text against the résumé.
 * Returns null when there are too few meaningful terms to say anything useful —
 * the caller should then show a retryable error rather than manufacture a score.
 * Read-only: never mutates `resume`.
 */
export function basicTextMatch(resume: ResumeFormData, jobText: string): BasicTextMatchResult | null {
  const keywords = extractJobKeywords(jobText, 25);
  if (keywords.length < MIN_BASIC_TERMS) return null;

  const fields = resumeFields(resume);
  const terms: BasicMatchTerm[] = keywords.map((t) => matchTerm(fields, t));
  const matchedCount = terms.filter((t) => t.matched).length;
  const coverage = Math.round((matchedCount / terms.length) * 100);

  return { mode: "basic", coverage, matchedCount, totalCount: terms.length, terms };
}
