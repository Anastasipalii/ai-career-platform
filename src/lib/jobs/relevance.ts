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

/** The complete, user-driven search intent for a job search. Derived ONLY from
 *  the user-entered Target Profession — never from the résumé — so the Target
 *  Profession is the single source of truth for the provider query, the domain
 *  family, the required job-title aliases and the exact/adjacent classification.
 *  The résumé-derived CandidateProfile still drives ranking, cover letter and
 *  interview downstream. */
export interface TargetSearchIntent {
  /** Normalized target profession (what the user typed). */
  profession: string;
  /** Domain-relevance terms used by classification + the strict gate. */
  requiredDomainTerms: string[];
  /** CONCISE query for keyword providers (Jooble) — just the target role. */
  providerQuery: string;
  /** Broader OR query for latest-jobs providers (Arbeitnow): the target role
   *  plus a SMALL set of domain aliases (never every résumé skill). */
  searchQuery: string;
}

/** Build the search intent from the user's Target Profession alone. */
export function searchIntentForProfession(targetProfession: string): TargetSearchIntent {
  const profession = (targetProfession ?? "").trim();
  const intent = deriveSearchIntent({ profession }, profession);
  // Arbeitnow OR-query: target role + a few high-signal domain aliases (cap the
  // set so it stays a focused query, not a résumé-skill dump).
  const aliases = intent.requiredDomainTerms.filter((t) => t.toLowerCase() !== profession.toLowerCase()).slice(0, 6);
  const searchQuery = [profession, ...aliases].filter(Boolean).join(" ").trim();
  return {
    profession,
    requiredDomainTerms: intent.requiredDomainTerms,
    providerQuery: profession,
    searchQuery: searchQuery || profession,
  };
}

// Provider titles frequently carry HTML entities ("F&amp;B Manager",
// "Bar &amp; Restaurant", "&#39;", "&ndash;"). Decode them BEFORE matching so a
// real title reads as its true text — otherwise "f&amp;b" never matches the
// "f&b" stem and a genuine F&B Manager is wrongly rejected. This is pure
// normalization: it only makes a title mean what it already says and can never
// admit an unrelated job.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", auml: "ä", ouml: "ö", uuml: "ü",
  szlig: "ß", eacute: "é", agrave: "à",
};
export function decodeEntities(s: string): string {
  if (!s || s.indexOf("&") === -1) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; } })
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
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
  const text = decodeEntities([job.title, ...(job.tags ?? [])].join(" ").toLowerCase());
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

// ============================================================================
// Exact vs. adjacent domain classification (PART 2/3/4)
// ----------------------------------------------------------------------------
// The binary gate above stays for back-compat; this classifier adds a stronger,
// family-aware decision used before ranking. Generic transferable words never
// qualify a job on their own; adjacency requires EXPLICIT evidence.
// ============================================================================

export type DomainKind = "exact" | "adjacent" | "rejected";

// STRONG legal evidence — a title/tags hit here is an EXACT legal match.
const LEGAL_STRONG = [
  "lawyer", "legal", "attorney", "counsel", "legal counsel", "jurist", "rechtsanwalt",
  "volljurist", "syndikus", "notar", "paralegal", "legal consultant", "legal advisor",
  "legal adviser", "contract manager", "compliance officer", "datenschutz",
  "data protection officer", "regulatory counsel", "general counsel", "legaltech",
];
// Adjacent legal/compliance — retained ONLY with explicit evidence.
const LEGAL_ADJACENT = ["kyc", "aml", "compliance", "regulatory", "sanctions", "financial crime", "geldwäsche", "geldwaesche"];

// STRONG frontend evidence — a title/tags hit is an EXACT frontend match.
const FRONTEND_STRONG = [
  "frontend", "front-end", "front end", "react", "reactjs", "react.js", "vue", "vue.js", "angular",
  "svelte", "javascript", "typescript", "css", "html", "tailwind", "next.js", "nextjs",
  "web developer", "web application developer", "ui developer", "ui engineer", "frontend developer",
  "front-end developer", "frontend engineer", "frontend software engineer", "react developer",
  "react engineer", "javascript developer", "typescript developer", "webentwickler", "frontend entwickler",
];
// Frontend EVIDENCE tokens used to rescue a generic "Software Engineer".
const FRONTEND_EVIDENCE = ["frontend", "front-end", "front end", "react", "vue", "angular", "javascript", "typescript", "css", "html", "ui", "web"];
const SOFTWARE_GENERIC = ["software engineer", "software developer", "softwareentwickler", "software engineering"];

// Unambiguous hospitality STEMS — matched as SUBSTRINGS so German compound words
// qualify (e.g. "Restaurantleitung", "Gastronomieleiter", "Systemgastronomie").
const RESTAURANT_STEMS = ["restaurant", "gastronom", "hospitality", "food & beverage", "food and beverage", "f&b", "culinar", "gastgeber"];
// Explicit strong titles (English + German) that may lack a bare stem.
const RESTAURANT_STRONG_TITLES = [
  "restaurant manager", "restaurantleiter", "restaurantleiterin", "restaurantleitung",
  "gastronomieleiter", "gastronomiemanager", "gastronomy manager", "hospitality manager",
  "f&b manager", "food and beverage manager", "food & beverage manager", "general manager restaurant",
  "hotel restaurant manager", "assistant restaurant manager", "shift manager restaurant",
  "sous chef", "head chef", "küchenchef", "chef de rang", "chef de partie", "restaurantfachmann",
  "restaurantfachfrau", "hotelfachmann", "hotelfachfrau",
];
// Lead roles that are EXACT only WITH hospitality evidence (title/desc).
const RESTAURANT_STRONG_LEAD = ["serviceleiter", "serviceleitung", "betriebsleiter", "küchenleiter", "kitchen manager"];
// Generic manager/supervisor roles → ADJACENT only WITH hospitality evidence.
const RESTAURANT_WEAK_LEAD = ["operations manager", "general manager", "shift manager", "assistant manager", "duty manager", "supervisor", "store manager", "schichtleiter", "teamleiter"];
// Hospitality evidence tokens (title or description).
const RESTAURANT_EVIDENCE = [
  "restaurant", "gastronom", "hospitality", "hotel", "food", "beverage", "kitchen", "küche",
  "culinar", "catering", "guest", "gastgeber", "f&b", "food service", "guest service", "kitchen operations",
  "restaurant operations", "hotel operations",
];

// STRONG medical evidence (English + German).
const MEDICAL_STRONG = [
  "medical", "medizinisch", "medizinische fachangestellte", "mfa", "arzthelfer", "arzthelferin",
  "nurse", "nursing", "krankenpfleger", "krankenschwester", "pflege", "pflegefachkraft", "clinical",
  "patient care", "physician", "arzt", "ärztin", "healthcare", "medical assistant", "medical office",
  "care assistant", "gesundheits",
];

export type JobFamily = "legal" | "frontend" | "restaurant" | "medical" | "generic";

const familyOf = (profession: string): JobFamily => {
  const p = (profession ?? "").toLowerCase();
  if (/\b(lawyer|legal|attorney|counsel|jurist|rechtsanwalt|volljurist|paralegal|compliance|datenschutz|data protection)\b/.test(p)) return "legal";
  if (/\b(frontend|front[\s-]?end|react|vue|angular|web develop|ui develop|ui engineer|javascript|typescript)\b/.test(p)) return "frontend";
  // Substring (not word-boundary) so German compounds like "Gastronomieleiter"
  // or "Systemgastronomie" still map to the restaurant family.
  if (/(restaurant|gastronom|hospitality|hotel|food|beverage|culinar|chef|kitchen|küche|waiter|barista|catering|f&b)/.test(p)) return "restaurant";
  if (/(medical|medizin|nurse|nursing|pflege|healthcare|clinical|patient|physician|arzt|mfa)/.test(p)) return "medical";
  return "generic";
};

/**
 * Classify a real job against the candidate's intent as an exact-domain match,
 * an adjacent match, or rejected. Title/tags drive exact matches; the free-text
 * description is only consulted to (a) rescue a generic "Software Engineer" with
 * frontend evidence, or (b) confirm an adjacent legal/compliance role. Generic
 * words (data, systems, documentation, healthcare, project, management) can
 * never independently qualify a job.
 */
export function classifyJobDomain(
  job: NormalizedJob,
  intent: { profession: string; requiredDomainTerms: string[] }
): DomainKind {
  return explainJobDomain(job, intent).kind;
}

/** Structured, PII-free explanation of a classification decision. Used for
 *  development diagnostics only; `classifyJobDomain` delegates to it so the two
 *  can never diverge. */
export interface DomainExplanation {
  kind: DomainKind;
  family: JobFamily;
  reason: string;
  /** Aliases / stems / required terms that matched (safe, no free text). */
  matched: string[];
  /** When rejected/adjacent, the evidence that was required but absent. */
  missing: string[];
}

const listMatch = (text: string, terms: string[]): string[] => terms.filter((t) => matchTerm(text, t));
const listStem = (text: string, stems: string[]): string[] => stems.filter((s) => text.includes(s));

/**
 * Explain (not just decide) how a real job classifies against the candidate's
 * intent. Behaviour is IDENTICAL to the previous classifyJobDomain — the branch
 * order and rules are preserved exactly — but it additionally reports the family,
 * the reason, which aliases/stems matched, and (for non-exact) what evidence was
 * missing. Consults only title/tags (+ description for the documented rescue/
 * evidence cases). No résumé text, API keys or PII are read.
 */
export function explainJobDomain(
  job: NormalizedJob,
  intent: { profession: string; requiredDomainTerms: string[] }
): DomainExplanation {
  const titleTags = decodeEntities([job.title, ...(job.tags ?? [])].join(" ").toLowerCase());
  const desc = decodeEntities((job.description ?? "").toLowerCase());
  const family = familyOf(intent.profession);

  if (family === "legal") {
    const strong = listMatch(titleTags, LEGAL_STRONG);
    if (strong.length) return { kind: "exact", family, reason: "strong legal title", matched: strong, missing: [] };
    const adj = [...listMatch(titleTags, LEGAL_ADJACENT), ...listMatch(desc, LEGAL_ADJACENT)];
    if (adj.length) return { kind: "adjacent", family, reason: "legal-adjacent evidence (KYC/AML/compliance/…)", matched: adj, missing: [] };
    return { kind: "rejected", family, reason: "legal family, no strong title or adjacent evidence", matched: [], missing: ["lawyer/counsel/compliance/regulatory"] };
  }

  if (family === "frontend") {
    const strong = listMatch(titleTags, FRONTEND_STRONG);
    if (strong.length) return { kind: "exact", family, reason: "strong frontend title", matched: strong, missing: [] };
    const generic = listMatch(titleTags, SOFTWARE_GENERIC);
    const evidence = [...listMatch(titleTags, FRONTEND_EVIDENCE), ...listMatch(desc, FRONTEND_EVIDENCE)];
    if (generic.length && evidence.length) return { kind: "adjacent", family, reason: "generic software title + frontend evidence", matched: [...generic, ...evidence], missing: [] };
    return { kind: "rejected", family, reason: generic.length ? "software title but no frontend evidence" : "frontend family, no frontend title", matched: generic, missing: ["frontend/react/vue/angular/js/ts/ui/web"] };
  }

  if (family === "restaurant") {
    const titleStems = listStem(titleTags, RESTAURANT_STEMS);
    const strongTitles = listMatch(titleTags, RESTAURANT_STRONG_TITLES);
    const evidenceHits = [
      ...listStem(titleTags, RESTAURANT_STEMS), ...listMatch(titleTags, RESTAURANT_EVIDENCE),
      ...listStem(desc, RESTAURANT_STEMS), ...listMatch(desc, RESTAURANT_EVIDENCE),
    ];
    const hospitalityEvidence = evidenceHits.length > 0;
    // EXACT — hospitality stem (substring, catches German compounds) or explicit strong title.
    if (titleStems.length || strongTitles.length)
      return { kind: "exact", family, reason: "hospitality stem/strong-title in title", matched: [...titleStems, ...strongTitles], missing: [] };
    // EXACT — strong lead role WITH hospitality evidence.
    const strongLead = listMatch(titleTags, RESTAURANT_STRONG_LEAD);
    if (strongLead.length && hospitalityEvidence)
      return { kind: "exact", family, reason: "strong lead role + hospitality evidence", matched: [...strongLead, ...evidenceHits], missing: [] };
    // ADJACENT — generic manager/supervisor ONLY with explicit hospitality evidence.
    const weakLead = listMatch(titleTags, RESTAURANT_WEAK_LEAD);
    if (weakLead.length && hospitalityEvidence)
      return { kind: "adjacent", family, reason: "generic manager + hospitality evidence", matched: [...weakLead, ...evidenceHits], missing: [] };
    // REJECTED — say precisely what was missing.
    const missing: string[] = [];
    if ((strongLead.length || weakLead.length) && !hospitalityEvidence)
      missing.push("restaurant/gastronomy/hospitality/hotel/food/F&B evidence in title or description");
    if (!titleStems.length && !strongTitles.length && !strongLead.length && !weakLead.length)
      missing.push("restaurant strong-title or lead alias in title/tags");
    return { kind: "rejected", family, reason: "restaurant family, but no strong-title/lead+evidence rule matched", matched: [...strongLead, ...weakLead], missing };
  }

  if (family === "medical") {
    const strong = listMatch(titleTags, MEDICAL_STRONG);
    if (strong.length) return { kind: "exact", family, reason: "strong medical title", matched: strong, missing: [] };
    return { kind: "rejected", family, reason: "medical family, no strong medical title", matched: [], missing: ["medical/nurse/pflege/clinical/patient"] };
  }

  // Generic families: exact when the title/tags share a required domain term.
  const terms = jobDomainTerms(job, intent.requiredDomainTerms);
  return terms.length > 0
    ? { kind: "exact", family, reason: "generic family: title/tags share a required domain term", matched: terms, missing: [] }
    : { kind: "rejected", family, reason: "generic family: no required domain term in title/tags", matched: [], missing: intent.requiredDomainTerms.slice(0, 8) };
}

/**
 * Order ranked matches EXACT-first, then adjacent, applying MIN_MATCH_SCORE to
 * both. Recall fallback: only when NO exact match survives do we surface strong
 * adjacent matches down to `adjacentFallback` (still domain-classified adjacent,
 * never unrelated), keeping their lower score. Pure — used by the workflow so
 * the behaviour is testable in isolation.
 */
export function selectDomainMatches<T extends { externalId?: string; matchScore?: number | null }>(
  ranked: T[],
  exactIds: Set<string>,
  opts: { min?: number; adjacentFallback?: number } = {}
): T[] {
  const min = opts.min ?? MIN_MATCH_SCORE;
  const fallback = opts.adjacentFallback ?? min;
  const isExact = (m: T) => Boolean(m.externalId && exactIds.has(m.externalId));
  const score = (m: T) => m.matchScore ?? 0;
  const byScore = (a: T, b: T) => score(b) - score(a);

  const exact = ranked.filter((m) => isExact(m) && score(m) >= min).sort(byScore);
  const adjacent = ranked.filter((m) => !isExact(m) && score(m) >= min).sort(byScore);
  const adjacentFB =
    exact.length === 0
      ? ranked.filter((m) => !isExact(m) && score(m) >= fallback && score(m) < min).sort(byScore)
      : [];
  return [...exact, ...adjacent, ...adjacentFB];
}
