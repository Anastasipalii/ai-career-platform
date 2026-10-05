// ============================================================================
// resume/resumeStrength — DETERMINISTIC Résumé Strength engine.
//
// Produces an explainable 0–100 "Résumé Strength Estimate" from ResumeFormData
// using measurable checks only. NO OpenAI, NO randomness, NO Date — the same
// résumé always yields the same score. This is an estimate of résumé quality and
// completeness, NOT a prediction of any employer's ATS behaviour or hiring
// outcome. It is read-only: it never mutates ResumeFormData.
//
// Rubric — category weights sum to 100:
//   Contact information        15
//   Professional summary       15
//   Work experience            30
//   Education                  10
//   Skills                     15
//   Readability / specificity  15
//   ----------------------------- 
//   TOTAL                     100
// ============================================================================

import type { ResumeFormData } from "@/app/components/resume-builder/types";

export interface StrengthCategory {
  key: string;
  label: string;
  score: number; // 0..max, integer
  max: number;
  /** Short, specific, actionable notes tied to what was missing/weak. */
  notes: string[];
}

export interface ResumeStrengthResult {
  overall: number; // 0..100, integer; equals the sum of category scores
  categories: StrengthCategory[];
  recommendations: string[];
}

// ── Small deterministic text helpers ────────────────────────────────────────
const words = (s: string): string[] => (s || "").trim().split(/\s+/).filter(Boolean);
const hasNumber = (s: string): boolean => /\d/.test(s || "");
const clampInt = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(n)));

// A conservative, well-known set of résumé action verbs (lower-cased).
const ACTION_VERBS = new Set([
  "led", "built", "created", "designed", "developed", "launched", "managed",
  "delivered", "improved", "increased", "reduced", "grew", "drove", "shipped",
  "owned", "implemented", "optimized", "optimised", "architected", "founded",
  "scaled", "automated", "streamlined", "spearheaded", "coordinated",
  "negotiated", "mentored", "analyzed", "analysed", "produced", "achieved",
  "generated", "boosted", "cut", "saved", "won", "established", "directed",
]);

function startsWithActionVerb(desc: string): boolean {
  // Check the first word of any line/bullet.
  return (desc || "")
    .split(/\r?\n|•|-\s/)
    .map((l) => l.trim().toLowerCase())
    .some((l) => l && ACTION_VERBS.has(l.split(/\s+/)[0]));
}

// ── Category scorers (each returns score 0..max) ─────────────────────────────
function scoreContact(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  let s = 0;
  if (f.fullName?.trim()) s += 4; else notes.push("Add your full name.");
  if (f.email?.trim()) s += 4; else notes.push("Add an email address.");
  if (f.phone?.trim()) s += 3; else notes.push("Add a phone number.");
  if (f.location?.trim()) s += 2; else notes.push("Add your location (city/country).");
  if (f.website?.trim() || f.linkedin?.trim()) s += 2;
  else notes.push("Add a LinkedIn or portfolio link.");
  return { key: "contact", label: "Contact information", score: clampInt(s, 0, 15), max: 15, notes };
}

function scoreSummary(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  const w = words(f.summary).length;
  let s = 0;
  if (w === 0) {
    notes.push("Add a professional summary (2–3 sentences).");
  } else {
    s += 6; // present
    if (w < 20) { s += 3; notes.push("Expand your summary to ~40–80 words."); }
    else if (w <= 120) { s += 9; }
    else { s += 6; notes.push("Tighten your summary to under ~120 words."); }
  }
  return { key: "summary", label: "Professional summary", score: clampInt(s, 0, 15), max: 15, notes };
}

function scoreExperience(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  const entries = f.experience || [];
  if (entries.length === 0) {
    notes.push("Add at least one work experience entry.");
    return { key: "experience", label: "Work experience", score: 0, max: 30, notes };
  }

  // Completeness (0..12): average field completeness across entries.
  let compTotal = 0;
  entries.forEach((e) => {
    let c = 0;
    if (e.role?.trim()) c += 3;
    if (e.company?.trim()) c += 3;
    if (e.startDate?.trim() || e.endDate?.trim()) c += 2;
    if (e.description?.trim()) c += 4;
    compTotal += c / 12;
  });
  const completeness = (compTotal / entries.length) * 12;

  // Description depth (0..10): average adequacy of description length.
  let depthTotal = 0;
  entries.forEach((e) => {
    const w = words(e.description).length;
    const adequacy = w === 0 ? 0 : w < 12 ? 0.4 : w <= 80 ? 1 : 0.8;
    depthTotal += adequacy;
  });
  const depth = (depthTotal / entries.length) * 10;

  // Evidence/specificity (0..8): fraction of entries with a metric or action verb.
  const withEvidence = entries.filter(
    (e) => hasNumber(e.description) || startsWithActionVerb(e.description)
  ).length;
  const evidence = (withEvidence / entries.length) * 8;

  const anyMetric = entries.some((e) => hasNumber(e.description));
  if (!anyMetric) notes.push("Add measurable outcomes (numbers, %, $) to your experience.");
  const incomplete = entries.some((e) => !e.role?.trim() || !e.company?.trim() || !e.description?.trim());
  if (incomplete) notes.push("Complete each role: title, company, and a description.");

  const s = clampInt(completeness + depth + evidence, 0, 30);
  return { key: "experience", label: "Work experience", score: s, max: 30, notes };
}

function scoreEducation(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  const entries = f.education || [];
  if (entries.length === 0) {
    notes.push("Add your education (degree and institution).");
    return { key: "education", label: "Education", score: 0, max: 10, notes };
  }
  // Best single entry drives the score (having one complete entry is enough).
  let best = 0;
  entries.forEach((e) => {
    let c = 0;
    if (e.institution?.trim()) c += 4;
    if (e.degree?.trim()) c += 4;
    if (e.field?.trim() || e.startDate?.trim() || e.endDate?.trim()) c += 2;
    best = Math.max(best, c);
  });
  if (best < 10) notes.push("Add the degree, field, and institution for your education.");
  return { key: "education", label: "Education", score: clampInt(best, 0, 10), max: 10, notes };
}

function scoreSkills(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  const n = (f.skills || []).filter((s) => s.trim()).length;
  let s: number;
  if (n === 0) { s = 0; notes.push("Add role-relevant skills."); }
  else if (n < 5) { s = 6; notes.push("Add more role-relevant skills (aim for 8–15)."); }
  else if (n < 10) { s = 12; notes.push("A few more relevant skills would strengthen this."); }
  else if (n <= 20) { s = 15; }
  else { s = 12; notes.push("Trim to your most relevant ~15 skills — avoid keyword stuffing."); }
  return { key: "skills", label: "Skills", score: s, max: 15, notes };
}

function scoreReadability(f: ResumeFormData): StrengthCategory {
  const notes: string[] = [];
  let s = 0;

  // Summary readability (0..5)
  const sumW = words(f.summary).length;
  if (sumW > 0) {
    const isAllCaps = f.summary === f.summary.toUpperCase() && /[A-Z]/.test(f.summary);
    s += isAllCaps ? 2 : 5;
    if (isAllCaps) notes.push("Avoid all-caps text in your summary.");
  }

  // Experience action verbs (0..5)
  const exp = f.experience || [];
  if (exp.length > 0) {
    const withVerbs = exp.filter((e) => startsWithActionVerb(e.description)).length;
    const frac = withVerbs / exp.length;
    s += Math.round(frac * 5);
    if (frac < 0.5) notes.push("Start experience bullets with strong action verbs (Led, Built, Improved…).");
  }

  // Quantified evidence anywhere in experience (0..5)
  if (exp.length > 0) {
    const anyMetric = exp.some((e) => hasNumber(e.description));
    s += anyMetric ? 5 : 0;
  }

  return { key: "readability", label: "Readability & specificity", score: clampInt(s, 0, 15), max: 15, notes };
}

// ── Public API ───────────────────────────────────────────────────────────────
/** Compute the deterministic Résumé Strength. Pure + read-only. */
export function computeResumeStrength(f: ResumeFormData): ResumeStrengthResult {
  const categories: StrengthCategory[] = [
    scoreContact(f),
    scoreSummary(f),
    scoreExperience(f),
    scoreEducation(f),
    scoreSkills(f),
    scoreReadability(f),
  ];
  const overall = clampInt(
    categories.reduce((sum, c) => sum + c.score, 0),
    0,
    100
  );
  // Recommendations: the notes from the weakest categories first (most impact).
  const recommendations = categories
    .slice()
    .sort((a, b) => (a.score / a.max) - (b.score / b.max))
    .flatMap((c) => c.notes)
    .slice(0, 6);

  return { overall, categories, recommendations };
}

/** Human band label for the overall score (UI convenience; not a prediction). */
export function strengthBand(overall: number): "Strong" | "Solid" | "Needs work" {
  if (overall >= 80) return "Strong";
  if (overall >= 55) return "Solid";
  return "Needs work";
}
