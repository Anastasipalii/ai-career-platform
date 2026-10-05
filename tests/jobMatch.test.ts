// Job Match engine — deterministic matching, normalization, validation, safety.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/jobMatch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTerm, termVariants, containsTerm,
  extractRequirementsLocally, validateRequirements, matchResumeToJob,
  basicTextMatch, extractJobKeywords, MIN_BASIC_TERMS,
  MIN_JOB_DESCRIPTION_CHARS,
  type JobRequirements,
} from "@/lib/resume/jobMatch";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

const resume: ResumeFormData = {
  fullName: "A B", jobTitle: "Frontend Engineer", email: "", phone: "", location: "",
  website: "", linkedin: "", photoUrl: "",
  summary: "Frontend engineer focused on accessible interfaces.",
  skills: ["React", "TypeScript", "CSS"],
  experience: [{ id: "1", company: "Acme", role: "Frontend Engineer", startDate: "2021", endDate: "2025",
    description: "Built React apps with GraphQL and improved performance." }],
  education: [], languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [],
};

test("normalizeTerm lowercases, trims, strips surrounding punctuation", () => {
  assert.equal(normalizeTerm("  React.js, "), "react.js");
  assert.equal(normalizeTerm("JavaScript"), "javascript");
});

test("termVariants offers safe variants only (react.js↔react), never unrelated concepts", () => {
  const v = termVariants("React.js");
  assert.ok(v.includes("react"));
  assert.ok(!v.includes("java")); // never invents unrelated terms
});

test("containsTerm matches whole words with case/variant tolerance, not substrings", () => {
  assert.equal(containsTerm("Skilled in React and CSS", "react"), true);
  assert.equal(containsTerm("React.js developer", "React"), true);
  assert.equal(containsTerm("I know JavaScript", "java"), false, "java must NOT match inside javascript");
  assert.equal(containsTerm("Built with C++ and C#", "c++"), true);
});

test("matched vs missing skill with correct evidence field", () => {
  const req: JobRequirements = { requiredSkills: ["React", "Kubernetes"], preferredSkills: [], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  const react = r.categories.find((c) => c.key === "required")!.matches.find((m) => m.term === "React")!;
  const k8s = r.categories.find((c) => c.key === "required")!.matches.find((m) => m.term === "Kubernetes")!;
  assert.equal(react.matched, true);
  assert.equal(react.evidence, "Skills");
  assert.equal(k8s.matched, false);
  assert.deepEqual(r.missingRequired, ["Kubernetes"]);
});

test("case normalization: 'REACT' / 'react' both match", () => {
  const r1 = matchResumeToJob(resume, { requiredSkills: ["REACT"], preferredSkills: [], importantKeywords: [], roleTitle: "" });
  assert.equal(r1.categories[0].matches[0].matched, true);
});

test("GraphQL found in experience evidence, not skills", () => {
  const r = matchResumeToJob(resume, { requiredSkills: ["GraphQL"], preferredSkills: [], importantKeywords: [], roleTitle: "" });
  assert.equal(r.categories[0].matches[0].evidence, "Experience");
});

test("required vs preferred kept distinct", () => {
  const req: JobRequirements = { requiredSkills: ["React"], preferredSkills: ["Figma"], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  assert.equal(r.categories.find((c) => c.key === "required")!.matches.length, 1);
  assert.equal(r.categories.find((c) => c.key === "preferred")!.matches[0].term, "Figma");
});

test("deterministic: same input → identical match result", () => {
  const req: JobRequirements = { requiredSkills: ["React","Go"], preferredSkills: ["CSS"], importantKeywords: ["frontend"], roleTitle: "Frontend Engineer" };
  const a = JSON.stringify(matchResumeToJob(resume, req));
  const b = JSON.stringify(matchResumeToJob(resume, req));
  assert.equal(a, b);
});

test("matching never mutates the résumé", () => {
  const before = JSON.stringify(resume);
  matchResumeToJob(resume, { requiredSkills: ["React"], preferredSkills: [], importantKeywords: [], roleTitle: "" });
  assert.equal(JSON.stringify(resume), before);
});

test("validateRequirements rejects malformed AI output (null / wrong shape / empty)", () => {
  assert.equal(validateRequirements(null), null);
  assert.equal(validateRequirements("nope"), null);
  assert.equal(validateRequirements({}), null);
  assert.equal(validateRequirements({ requiredSkills: [], preferredSkills: [], importantKeywords: [] }), null);
});

test("validateRequirements keeps only strings and never upgrades preferred→required", () => {
  const v = validateRequirements({
    requiredSkills: ["React", 5, "React"],   // dedupes, drops non-string
    preferredSkills: ["React", "Figma"],      // React already required → removed from preferred
    importantKeywords: ["frontend", ""],
    roleTitle: "Engineer",
  })!;
  assert.deepEqual(v.requiredSkills, ["React"]);
  assert.deepEqual(v.preferredSkills, ["Figma"]);
  assert.deepEqual(v.importantKeywords, ["frontend"]);
});

test("local extraction pulls real JD terms, ignores stop words, no fabrication", () => {
  const jd = "We need a Frontend Engineer. Requirements:\n- React\n- TypeScript\nNice to have:\n- GraphQL\nYou will work with the team every day.";
  const req = extractRequirementsLocally(jd);
  assert.ok(req.requiredSkills.some((s) => /react/i.test(s)));
  assert.ok(req.preferredSkills.some((s) => /graphql/i.test(s)));
  // stop words never surface as keywords
  assert.ok(!req.importantKeywords.includes("the"));
  assert.ok(!req.importantKeywords.includes("with"));
  // every keyword actually appears in the JD text (nothing invented)
  const low = jd.toLowerCase();
  for (const k of req.importantKeywords) assert.ok(low.includes(k), `${k} present in JD`);
});

test("duplicate keywords do not inflate score (deduped across categories)", () => {
  const req: JobRequirements = { requiredSkills: ["React"], preferredSkills: [], importantKeywords: ["react", "React"], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  // 'react' keyword is deduped against requiredSkills → keyword category has no terms
  assert.equal(r.categories.find((c) => c.key === "keywords")!.matches.length, 0);
});

test("overall stays within 0..100", () => {
  const r = matchResumeToJob(resume, { requiredSkills: ["React","Go","Rust"], preferredSkills: ["CSS"], importantKeywords: ["frontend"], roleTitle: "Frontend Engineer" });
  assert.ok(r.overall >= 0 && r.overall <= 100);
});

test("MIN_JOB_DESCRIPTION_CHARS is a sane minimum", () => {
  assert.ok(MIN_JOB_DESCRIPTION_CHARS >= 50);
});

// ── Degraded "Basic text match" ─────────────────────────────────────────────
const jdFull = "Frontend Engineer. We build React apps with TypeScript and GraphQL. " +
  "You will improve performance and accessibility across our design system every day.";

test("basicTextMatch reports lexical coverage only — no required/preferred classification", () => {
  const b = basicTextMatch(resume, jdFull)!;
  assert.equal(b.mode, "basic");
  assert.ok(typeof b.coverage === "number" && b.coverage >= 0 && b.coverage <= 100);
  assert.equal(b.matchedCount + (b.totalCount - b.matchedCount), b.totalCount);
  // The degraded result MUST NOT carry required/preferred structure.
  assert.ok(!("categories" in b), "no rubric categories");
  assert.ok(!("requiredSkills" in b) && !("preferredSkills" in b), "no required/preferred fields");
});

test("basicTextMatch returns null when there are too few meaningful terms (prefer retryable error)", () => {
  const tiny = "We need help. You will do the work with the team.";
  assert.equal(basicTextMatch(resume, tiny), null);
});

test("basic coverage is a DIFFERENT metric from the full Job Match score (different rubric)", () => {
  const req: JobRequirements = { requiredSkills: ["React"], preferredSkills: [], importantKeywords: [], roleTitle: "Frontend Engineer" };
  const full = matchResumeToJob(resume, req);
  const b = basicTextMatch(resume, jdFull)!;
  // They measure different things; the basic result exposes `coverage`, the full exposes `overall`.
  assert.ok("overall" in full && !("coverage" in full));
  assert.ok("coverage" in b && !("overall" in b));
});

test("basicTextMatch is deterministic and never mutates the résumé", () => {
  const before = JSON.stringify(resume);
  const a = JSON.stringify(basicTextMatch(resume, jdFull));
  const b = JSON.stringify(basicTextMatch(resume, jdFull));
  assert.equal(a, b);
  assert.equal(JSON.stringify(resume), before);
});

test("extractJobKeywords returns only real JD terms, stop words removed", () => {
  const ks = extractJobKeywords(jdFull, 25);
  assert.ok(ks.includes("react") && ks.includes("typescript"));
  assert.ok(!ks.includes("the") && !ks.includes("with"));
  assert.ok(ks.length >= MIN_BASIC_TERMS);
});
