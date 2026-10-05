// Pure-logic tests for the AI workflow reliability layer. No network, no
// OpenAI, no provider. Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/workflow.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { detectResumeLanguage, normalizeLanguage } from "@/lib/i18n/detectLanguage";
import { buildCandidateProfile } from "@/lib/workflow/candidateProfile";
import { deriveSearchIntent, jobHasDomainMatch, acceptJobMatch, MIN_MATCH_SCORE } from "@/lib/jobs/relevance";

// ── helpers ─────────────────────────────────────────────────────────────────
type AnyAnalysis = Parameters<typeof buildCandidateProfile>[0];
const analysis = (profession: string, skills: string[], extra: Record<string, unknown> = {}) =>
  ({
    profession, specialization: "", seniority: "Mid-level", industries: [],
    softSkills: [], careerGoals: [], detectedSkills: skills, detectedLanguages: ["English"],
    experienceSummary: "", strengths: [], weaknesses: [], missingSkills: [], atsScore: 70,
    recommendations: [], ...extra,
  }) as unknown as AnyAnalysis;

// job factory (only fields the gate reads)
const job = (title: string, tags: string[] = []) =>
  ({
    externalId: title, provider: "arbeitnow", title, company: "C", location: "Berlin",
    remote: false, description: "generic description with management customer operations data",
    tags, jobTypes: ["full-time"], publishedAt: null, sourceUrl: "u", applyUrl: "u",
  }) as unknown as Parameters<typeof jobHasDomainMatch>[0];

const termsFor = (profession: string, skills: string[]) => {
  const p = buildCandidateProfile(analysis(profession, skills), "English");
  return p.requiredDomainTerms;
};

// ── 1. language detection ─────────────────────────────────────────────────────
test("detects English résumé", () => {
  assert.equal(
    detectResumeLanguage("Experienced frontend developer with a strong focus on React and the web."),
    "English"
  );
});

test("detects German résumé (not English)", () => {
  assert.equal(
    detectResumeLanguage("Erfahrener Restaurantleiter mit Verantwortung für den Betrieb und das Team."),
    "German"
  );
});

test("detects French résumé", () => {
  assert.equal(
    detectResumeLanguage("Développeur expérimenté avec une solide expérience dans le développement web et les compétences."),
    "French"
  );
});

test("user-selected language overrides detection", () => {
  assert.equal(detectResumeLanguage("Erfahrener Entwickler mit dem Team", "en"), "English");
  assert.equal(normalizeLanguage("Deutsch"), "German");
});

test("empty/too-short text defaults to English", () => {
  assert.equal(detectResumeLanguage(""), "English");
  assert.equal(detectResumeLanguage("dev"), "English");
});

// ── 2. CandidateProfile building ───────────────────────────────────────────────
test("profile carries résumé language and profession, plus domain terms", () => {
  const p = buildCandidateProfile(analysis("Frontend Developer", ["React", "TypeScript"]), "German", "5 years of experience");
  assert.equal(p.resumeLanguage, "German");
  assert.equal(p.profession, "Frontend Developer");
  assert.ok(p.targetRoles.length > 0);
  assert.ok(p.requiredDomainTerms.length > 0);
  assert.equal(p.yearsOfExperience, 5);
});

test("target role is résumé-derived, never a provider job title", () => {
  const p = buildCandidateProfile(analysis("Lawyer", ["Contract law"]), "English");
  // targetRoles come only from profession/seniority/specialization.
  assert.ok(p.targetRoles.every((r) => /lawyer/i.test(r)));
});

test("yearsOfExperience is null when not stated", () => {
  const p = buildCandidateProfile(analysis("Accountant", ["Audit"]), "English", "no numbers here");
  assert.equal(p.yearsOfExperience, null);
});

// ── 3. generic-token exclusion ─────────────────────────────────────────────────
test("generic cross-profession words never become domain terms", () => {
  const intent = deriveSearchIntent({
    profession: "Operations Manager",
    detectedSkills: ["Management", "Operations", "Communication", "Customer", "CRM", "Project", "Business", "Data", "Service"],
    industries: [],
  });
  for (const generic of ["management", "operations", "communication", "customer", "crm", "project", "business", "service"]) {
    assert.ok(!intent.requiredDomainTerms.includes(generic), `"${generic}" must not be a domain term`);
  }
});

// ── 4/5. domain matching + cross-profession rejection ──────────────────────────
test("legal profile rejects software / AI / sales / restaurant, accepts legal", () => {
  const terms = termsFor("Lawyer", ["Contract law", "Litigation", "Compliance"]);
  assert.ok(jobHasDomainMatch(job("Legal Counsel", ["legal", "compliance"]), terms));
  assert.ok(jobHasDomainMatch(job("Paralegal", ["law"]), terms));
  assert.ok(!jobHasDomainMatch(job("Senior Software Engineer", ["react", "node"]), terms));
  assert.ok(!jobHasDomainMatch(job("Senior AI Engineering Consultant", ["ai", "ml"]), terms));
  assert.ok(!jobHasDomainMatch(job("Senior Sales Consultant", ["sales"]), terms));
  assert.ok(!jobHasDomainMatch(job("Restaurant Manager", ["hospitality"]), terms));
});

test("frontend profile rejects HR / restaurant / finance, accepts software", () => {
  const terms = termsFor("Frontend Developer", ["React", "TypeScript", "CSS"]);
  assert.ok(jobHasDomainMatch(job("Frontend Developer", ["react", "frontend"]), terms));
  assert.ok(jobHasDomainMatch(job("Software Engineer", ["javascript", "web"]), terms));
  assert.ok(!jobHasDomainMatch(job("HR Business Partner", ["hr", "recruiting"]), terms));
  assert.ok(!jobHasDomainMatch(job("Talent Acquisition Specialist", ["talent"]), terms));
  assert.ok(!jobHasDomainMatch(job("Restaurant Manager", ["hospitality"]), terms));
  assert.ok(!jobHasDomainMatch(job("Finance Controller", ["finance"]), terms));
});

test("restaurant profile rejects software / legal, accepts hospitality", () => {
  const terms = termsFor("Restaurant Manager", ["Food and beverage", "Hospitality", "Catering"]);
  assert.ok(jobHasDomainMatch(job("Restaurant Manager", ["restaurant", "hospitality"]), terms));
  assert.ok(jobHasDomainMatch(job("Hotel Operations Manager", ["hotel", "food"]), terms));
  assert.ok(!jobHasDomainMatch(job("Frontend Developer", ["react"]), terms));
  assert.ok(!jobHasDomainMatch(job("Legal Counsel", ["legal"]), terms));
});

test("accounting profile rejects marketing / software, accepts finance", () => {
  const terms = termsFor("Accountant", ["Accounting", "Audit", "Tax"]);
  assert.ok(jobHasDomainMatch(job("Senior Accountant", ["accounting", "tax"]), terms));
  assert.ok(jobHasDomainMatch(job("Finance Controller", ["finance"]), terms));
  assert.ok(!jobHasDomainMatch(job("Marketing Manager", ["seo", "marketing"]), terms));
  assert.ok(!jobHasDomainMatch(job("Frontend Developer", ["react"]), terms));
});

// ── 6. employment metadata / seniority never qualifies ─────────────────────────
test("seniority / contract type alone never qualifies a job", () => {
  const terms = termsFor("Lawyer", ["Contract law", "Compliance"]);
  // A software job whose only shared words are generic employment metadata.
  assert.ok(!jobHasDomainMatch(job("Senior Consultant (Full-time, Remote)", ["permanent", "manager"]), terms));
});

// ── 7. description-only mention does not qualify (title/tags gate) ──────────────
test("a domain word only in the description does not qualify an off-domain title", () => {
  const terms = termsFor("Lawyer", ["Contract law", "Compliance"]);
  const softwareJobWithLegalInDescription = {
    externalId: "x", provider: "arbeitnow", title: "Backend Engineer", company: "C",
    location: "Berlin", remote: false,
    description: "You will work on compliance-related legal contract systems.", // legal words here only
    tags: ["python", "api"], jobTypes: ["full-time"], publishedAt: null, sourceUrl: "u", applyUrl: "u",
  } as unknown as Parameters<typeof jobHasDomainMatch>[0];
  assert.ok(!jobHasDomainMatch(softwareJobWithLegalInDescription, terms));
});

// ── 8. empty terms → gate is permissive only when nothing to gate on ───────────
test("empty required terms means no gate (returns true)", () => {
  assert.ok(jobHasDomainMatch(job("Anything"), []));
});

// ── 8b. final acceptance rule (score threshold) ────────────────────────────────
test("acceptJobMatch keeps score >= 40 and drops weak/absent scores", () => {
  assert.equal(MIN_MATCH_SCORE, 40);
  assert.ok(acceptJobMatch({ matchScore: 40 }));
  assert.ok(acceptJobMatch({ matchScore: 91 }));
  assert.ok(acceptJobMatch({ matchScore: 50 })); // provider-only neutral pass
  assert.ok(!acceptJobMatch({ matchScore: 39 }));
  assert.ok(!acceptJobMatch({ matchScore: 15 })); // weak off-domain adjacency
  assert.ok(!acceptJobMatch({ matchScore: 0 }));
  assert.ok(!acceptJobMatch({ matchScore: null }));
  assert.ok(!acceptJobMatch({}));
});

// ── 9. no cross-run reuse: different résumés → different profiles ──────────────
test("different analyses produce different professions/terms (no shared state)", () => {
  const a = buildCandidateProfile(analysis("Lawyer", ["Contract law"]), "English");
  const b = buildCandidateProfile(analysis("Frontend Developer", ["React"]), "English");
  assert.notEqual(a.profession, b.profession);
  assert.notDeepEqual(a.requiredDomainTerms, b.requiredDomainTerms);
});
