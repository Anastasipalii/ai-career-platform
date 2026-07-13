// ============================================================================
// workflow/candidateProfile — the single source of truth for a workflow run
// ----------------------------------------------------------------------------
// Built ONCE, immediately after résumé analysis, from the master analysis plus
// the deterministically detected résumé language. Every downstream module (job
// search, relevance, ranking, cover letter, interview, ATS, missing skills)
// reads from this profile. Profession/role are NEVER rebuilt from provider job
// titles later.
// ============================================================================

import type { ResumeAnalysis } from "@/lib/workflowRun";
import type { SupportedLanguage } from "@/lib/i18n/detectLanguage";
import { deriveSearchIntent } from "@/lib/jobs/relevance";

export interface CandidateProfile {
  profession: string;
  specialization: string;
  seniority: string;
  industries: string[];
  /** Résumé-derived target roles (in the résumé's own language) — never job titles. */
  targetRoles: string[];
  /** Profession-specific terms that qualify a vacancy as domain-relevant. */
  requiredDomainTerms: string[];
  /** Generic role suffixes (consultant/manager/…) — hints only, never qualify. */
  optionalModifiers: string[];
  /** Concrete hard skills that define the domain. */
  relevantSkills: string[];
  /** Softer / secondary skills — hints only, not domain-defining. */
  optionalSkills: string[];
  /** Languages the candidate speaks (from the résumé). */
  spokenLanguages: string[];
  /** The language every generated output must use. */
  resumeLanguage: SupportedLanguage;
  location: string | null;
  workPreferences: string[];
  /** Years of experience when reliably extractable from the résumé, else null. */
  yearsOfExperience: number | null;
}

/** Résumé-derived target role (seniority + profession) — no provider data. */
function deriveTargetRole(profession: string, seniority: string): string {
  const p = profession.trim();
  if (!p) return "";
  const s = seniority.trim();
  return s && !/junior|entry/i.test(s) ? `${s} ${p}`.trim() : p;
}

/** Extract years of experience from résumé text when clearly stated, else null.
 *  Supports EN/DE/FR/ES/IT/NL/PL "N years" phrasings. Never fabricated. */
function extractYearsOfExperience(resumeText: string): number | null {
  if (!resumeText) return null;
  const re = /(\d{1,2})\s*\+?\s*(?:years?|yrs?|jahre?|ans|años|anni|jaar|lat|lata)\b/gi;
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(resumeText)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 50) best = Math.max(best ?? 0, n);
  }
  return best;
}

/** Assemble the CandidateProfile from analysis + detected language + résumé text.
 *  This is the single source of truth for the run — profession/target role/domain
 *  terms are derived ONLY from the résumé here, never from provider job titles. */
export function buildCandidateProfile(
  analysis: ResumeAnalysis | null,
  resumeLanguage: SupportedLanguage,
  resumeText = ""
): CandidateProfile {
  const profession = (analysis?.profession ?? "").trim();
  const specialization = (analysis?.specialization ?? "").trim();
  const seniority = (analysis?.seniority ?? "").trim();
  const relevantSkills = analysis?.detectedSkills ?? [];
  const industries = analysis?.industries ?? [];

  const targetRoles = Array.from(
    new Set(
      [deriveTargetRole(profession, seniority), profession, specialization].filter(
        (r) => r && r.trim().length > 0
      )
    )
  );

  // Domain search intent is computed once here so the profile carries it.
  const intent = deriveSearchIntent({
    profession,
    specialization,
    detectedSkills: relevantSkills,
    industries,
    targetRoles,
  });

  return {
    profession,
    specialization,
    seniority,
    industries,
    targetRoles,
    requiredDomainTerms: intent.requiredDomainTerms,
    optionalModifiers: intent.optionalModifiers,
    relevantSkills,
    optionalSkills: analysis?.softSkills ?? [],
    spokenLanguages: analysis?.detectedLanguages ?? [],
    resumeLanguage,
    location: null, // not provided by analysis — never fabricated
    workPreferences: [],
    yearsOfExperience: extractYearsOfExperience(resumeText),
  };
}
