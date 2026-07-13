// ============================================================================
// jobs/relevance — profession-specific search intent + domain relevance gate
// ----------------------------------------------------------------------------
// Turns the resume analysis into REQUIRED domain terms (profession concepts)
// and OPTIONAL modifiers (generic role suffixes). A listing qualifies only when
// it contains at least one REQUIRED domain term — a generic modifier such as
// "consultant"/"manager"/"engineer" alone never qualifies. This is used to
// build the provider query and to gate jobs before ranking, so e.g. a legal
// resume does not surface Sales/SAP/MES/AI/Software roles.
//
// Pure functions, no I/O, no provider coupling.
// ============================================================================

import type { NormalizedJob } from "@/lib/jobs/types";

export interface SearchIntent {
  profession: string;
  /** Domain concept terms — at least one MUST match for a job to qualify. */
  requiredDomainTerms: string[];
  /** Generic role suffixes — hints only; never qualify a job on their own. */
  optionalModifiers: string[];
}

// Generic role suffixes shared across unrelated fields — never a qualifier.
const MODIFIERS = new Set([
  "consultant", "specialist", "manager", "engineer", "developer", "analyst",
  "associate", "coordinator", "lead", "senior", "junior", "principal", "staff",
  "head", "director", "officer", "expert", "professional", "assistant", "intern",
  "trainee", "representative", "administrator", "executive", "agent", "supervisor",
  "mid", "midlevel", "entry", "level",
]);

// Generic business/soft words that appear across ALL professions. These must
// NEVER create a domain match (a Frontend CV must not match "management",
// "operations", "customer", etc.). Excluded from required domain terms.
const GENERIC = new Set([
  "management", "operations", "operation", "communication", "communications",
  "customer", "business", "analysis", "analytics", "project", "projects",
  "support", "documentation", "leadership", "planning", "research",
  "coordination", "crm", "service", "services", "administration", "strategy",
  "strategic", "organization", "organizational", "teamwork", "collaboration",
  "stakeholder", "stakeholders", "reporting", "budget", "budgeting", "scheduling",
  "presentation", "negotiation", "problem", "solving", "detail", "oriented",
  "process", "processes", "quality", "improvement", "innovation", "digital",
  "technology", "technical", "solutions",
]);

// Non-informative words dropped from term extraction.
const STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you", "our",
  "their", "are", "was", "were", "will", "have", "has", "had", "not", "but",
  "all", "any", "can", "per", "via", "into", "onto", "over", "under", "about",
  "across", "using", "use", "used", "work", "works", "working", "job", "jobs",
  "role", "roles", "position", "team", "teams", "new", "years", "year", "field",
  "industry", "industries", "strong", "various", "etc", "including", "based",
  "remote", "fulltime", "parttime", "time", "level", "entry",
]);

// Curated domain-synonym groups for recall on common fields. `match` keys are
// checked against the analysis tokens/phrases; when hit, `terms` are added to
// the required set. Single-word keys match by exact token; multiword by phrase.
const DOMAIN_SYNONYMS: { match: string[]; terms: string[] }[] = [
  {
    match: ["law", "legal", "lawyer", "attorney", "jurist", "counsel", "litigation", "compliance", "paralegal", "regulatory", "gdpr", "contract law"],
    terms: ["legal", "law", "lawyer", "jurist", "counsel", "compliance", "paralegal", "litigation", "regulatory", "gdpr", "contract law", "legal counsel"],
  },
  {
    match: ["frontend", "front-end", "react", "vue", "angular", "javascript", "typescript", "css", "html", "tailwind", "next.js"],
    terms: ["frontend", "front-end", "react", "vue", "angular", "javascript", "typescript", "css", "html", "web"],
  },
  {
    match: ["backend", "back-end", "node", "python", "java", "golang", "api", "microservice", "microservices", "django", "spring", "sql"],
    terms: ["backend", "back-end", "api", "python", "java", "node", "microservices", "sql", "software"],
  },
  {
    match: ["machine learning", "ml", "artificial intelligence", "data science", "tensorflow", "pytorch", "nlp", "llm", "automation", "rpa", "workflow", "integration", "pipeline"],
    terms: ["ai", "artificial intelligence", "machine learning", "automation", "integration", "workflow", "llm", "data", "python", "rpa"],
  },
  {
    match: ["ux", "ui", "figma", "wireframe", "prototype", "user research", "interaction design", "product design"],
    terms: ["design", "ux", "ui", "figma", "product design", "user research"],
  },
  {
    match: ["marketing", "seo", "content", "campaign", "brand", "social media", "growth"],
    terms: ["marketing", "seo", "content", "brand", "campaign", "growth", "social media"],
  },
  {
    match: ["sales", "account executive", "business development", "crm", "quota", "prospecting"],
    terms: ["sales", "account", "business development", "revenue", "crm"],
  },
  {
    match: ["accounting", "accountant", "finance", "audit", "gaap", "tax", "bookkeeping", "reconciliation"],
    terms: ["finance", "accounting", "accountant", "audit", "tax", "financial"],
  },
  {
    match: ["human resources", "recruiting", "recruiter", "talent", "people ops", "onboarding"],
    terms: ["human resources", "recruiting", "talent", "people operations"],
  },
  {
    match: ["nurse", "physician", "clinical", "medical", "patient", "healthcare", "pharmacology"],
    terms: ["medical", "clinical", "nurse", "healthcare", "patient", "physician"],
  },
  {
    match: ["restaurant", "hospitality", "hotel", "food", "beverage", "catering", "culinary", "chef", "kitchen", "guest", "gastronomy", "waiter", "barista"],
    terms: ["restaurant", "hospitality", "hotel", "food", "beverage", "catering", "culinary", "chef", "kitchen", "guest", "gastronomy"],
  },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
}

interface AnalysisLike {
  profession?: string;
  specialization?: string;
  detectedSkills?: string[];
  industries?: string[];
  /** Résumé-derived target roles (never provider job titles). */
  targetRoles?: string[];
}

/** Derive profession-specific required domain terms + optional modifiers. */
export function deriveSearchIntent(analysis: AnalysisLike | null, targetRole = ""): SearchIntent {
  const profession = (analysis?.profession ?? "").trim();
  const specialization = (analysis?.specialization ?? "").trim();
  const skills = analysis?.detectedSkills ?? [];
  const industries = analysis?.industries ?? [];
  const targetRoles = analysis?.targetRoles ?? [];

  const phrases: string[] = [profession, specialization, targetRole, ...targetRoles, ...skills, ...industries]
    .map((p) => (p ?? "").trim().toLowerCase())
    .filter(Boolean);

  const required = new Set<string>();
  const modifiers = new Set<string>();
  const tokenSet = new Set<string>();

  for (const p of phrases) {
    const toks = tokenize(p).filter((t) => t.length >= 3 && !STOP.has(t));
    toks.forEach((t) => tokenSet.add(t));
    // Domain tokens exclude BOTH generic role modifiers AND generic
    // cross-profession words, so only profession-specific terms qualify.
    const domainToks = toks.filter((t) => !MODIFIERS.has(t) && !GENERIC.has(t));
    domainToks.forEach((t) => required.add(t));
    toks.filter((t) => MODIFIERS.has(t)).forEach((t) => modifiers.add(t));
    // Keep a meaningful multi-word phrase (e.g. "contract law", "machine learning").
    if (domainToks.length >= 2) required.add(domainToks.join(" "));
  }

  // Curated synonym expansion (recall) — profession-agnostic across fields.
  // Curated terms are ALSO filtered through GENERIC so no generic word can ever
  // qualify a vacancy, regardless of which group listed it.
  const hay = phrases.join(" ");
  const matched = (m: string) => (m.includes(" ") ? hay.includes(m) : tokenSet.has(m));
  for (const group of DOMAIN_SYNONYMS) {
    if (group.match.some(matched)) {
      group.terms.forEach((t) => {
        const tl = t.toLowerCase();
        if (!GENERIC.has(tl)) required.add(tl);
      });
    }
  }

  return {
    profession,
    requiredDomainTerms: Array.from(required).slice(0, 18),
    optionalModifiers: Array.from(modifiers),
  };
}

/** Match a single term against lowercased text (word-boundary for plain words). */
function matchTerm(text: string, term: string): boolean {
  if (!term) return false;
  if (term.includes(" ") || /[^a-z0-9]/.test(term)) return text.includes(term);
  return new RegExp(`\\b${term}\\b`).test(text);
}

/**
 * A job qualifies only if its TITLE or TAGS contain at least one REQUIRED
 * domain term. The free-text description is intentionally excluded (an
 * incidental word there must not qualify an off-domain role), as are employment
 * jobTypes and location. Returns the matched terms so callers can log/threshold.
 */
export function jobDomainTerms(job: NormalizedJob, requiredDomainTerms: string[]): string[] {
  if (requiredDomainTerms.length === 0) return [];
  const text = [job.title, ...(job.tags ?? [])].join(" ").toLowerCase();
  return requiredDomainTerms.filter((t) => matchTerm(text, t));
}

/** Strict domain gate: true when the title/tags share ≥1 required domain term. */
export function jobHasDomainMatch(job: NormalizedJob, requiredDomainTerms: string[]): boolean {
  if (requiredDomainTerms.length === 0) return true; // nothing to gate on
  return jobDomainTerms(job, requiredDomainTerms).length > 0;
}

/**
 * Final acceptance threshold applied AFTER the domain gate + AI ranking. A job
 * must be domain-qualified (already enforced upstream) AND score at least this.
 * Domain-qualified jobs surfaced when the ranker is unavailable carry a neutral
 * pass score (>= this), so this only removes genuinely weak ranked matches.
 * It never fabricates or hides niche jobs merely because there are few results.
 */
export const MIN_MATCH_SCORE = 40;

/** Shared acceptance predicate — used identically wherever job matches surface. */
export function acceptJobMatch(m: { matchScore?: number | null }): boolean {
  return (m.matchScore ?? 0) >= MIN_MATCH_SCORE;
}
