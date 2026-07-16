// Tests for the multi-provider job search: Jooble normalization, cross-provider
// merge/dedup, failure combination, and that the existing strict gate + threshold
// still apply to the combined set. Pure logic — no network.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/jobsProviders.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeJoobleJob, type JoobleJob } from "@/lib/jobs/providers/jooble";
import { dedupeJobs, combineProviderResults, jobSignature } from "@/lib/jobs/merge";
import { jobHasDomainMatch, acceptJobMatch, MIN_MATCH_SCORE } from "@/lib/jobs/relevance";
import { buildCandidateProfile } from "@/lib/workflow/candidateProfile";
import type { NormalizedJob, JobProviderResult } from "@/lib/jobs/types";

const job = (o: Partial<NormalizedJob> = {}): NormalizedJob => ({
  externalId: o.externalId ?? "x-1",
  provider: o.provider ?? "arbeitnow",
  title: o.title ?? "Frontend Developer",
  company: o.company ?? "Acme",
  location: o.location ?? "Berlin",
  remote: o.remote ?? false,
  description: o.description ?? "React and TypeScript",
  tags: o.tags ?? [],
  jobTypes: o.jobTypes ?? ["full-time"],
  publishedAt: o.publishedAt ?? null,
  sourceUrl: o.sourceUrl ?? "https://example.com/jobs/1",
  applyUrl: o.applyUrl ?? "https://example.com/jobs/1",
  ...(o.synthetic !== undefined ? { synthetic: o.synthetic } : {}),
});

// ── Jooble normalization ──────────────────────────────────────────────────────
test("normalizeJoobleJob maps raw Jooble into NormalizedJob (provider preserved)", () => {
  const raw: JoobleJob = {
    id: 12345, title: "Marketing Manager", company: "BrightCo", location: "Munich",
    snippet: "Own the marketing funnel.", type: "Full-time", link: "https://jooble.org/desc/9",
    updated: "2026-07-14T10:00:00Z",
  };
  const n = normalizeJoobleJob(raw)!;
  assert.equal(n.provider, "jooble");
  assert.equal(n.externalId, "jooble-12345"); // provider-prefixed, collision-safe
  assert.equal(n.title, "Marketing Manager");
  assert.equal(n.company, "BrightCo");
  assert.equal(n.sourceUrl, "https://jooble.org/desc/9");
  assert.equal(n.applyUrl, n.sourceUrl); // apply == listing; never auto-submitted
  assert.deepEqual(n.jobTypes, ["Full-time"]);
  assert.equal(n.publishedAt, "2026-07-14T10:00:00.000Z");
});

test("normalizeJoobleJob drops records missing title or link (never fabricates)", () => {
  assert.equal(normalizeJoobleJob({ title: "", link: "https://x" }), null);
  assert.equal(normalizeJoobleJob({ title: "Nurse", link: "" }), null);
});

test("normalizeJoobleJob keeps company empty (aggregated listing) and infers remote", () => {
  const n = normalizeJoobleJob({ id: 1, title: "Support Agent", link: "https://j/1", location: "Remote (EU)" })!;
  assert.equal(n.company, ""); // not invented
  assert.equal(n.remote, true);
  assert.equal(n.externalId, "jooble-1");
});

// ── broad non-technical coverage passes the domain gate ───────────────────────
const termsFor = (profession: string, skills: string[]) =>
  buildCandidateProfile(
    { profession, specialization: "", seniority: "Mid-level", industries: [], softSkills: [], careerGoals: [],
      detectedSkills: skills, detectedLanguages: ["English"], experienceSummary: "", strengths: [], weaknesses: [],
      missingSkills: [], atsScore: 70, recommendations: [] } as unknown as Parameters<typeof buildCandidateProfile>[0],
    "English"
  ).requiredDomainTerms;

test("non-technical Jooble jobs pass the strict domain gate for matching profiles", () => {
  const marketing = termsFor("Marketing Manager", ["SEO", "campaigns"]);
  const nurse = termsFor("Registered Nurse", ["patient care"]);
  assert.equal(jobHasDomainMatch(job({ provider: "jooble", title: "Marketing Manager", tags: [] }), marketing), true);
  assert.equal(jobHasDomainMatch(job({ provider: "jooble", title: "Registered Nurse", tags: [] }), nurse), true);
});

test("unrelated jobs are still rejected by the strict gate", () => {
  const marketing = termsFor("Marketing Manager", ["SEO"]);
  assert.equal(jobHasDomainMatch(job({ title: "Warehouse Forklift Operator", tags: [] }), marketing), false);
});

test("MIN_MATCH_SCORE is still enforced on ranked matches", () => {
  assert.equal(acceptJobMatch({ matchScore: MIN_MATCH_SCORE }), true);
  assert.equal(acceptJobMatch({ matchScore: MIN_MATCH_SCORE - 1 }), false);
  assert.equal(acceptJobMatch({ matchScore: null }), false);
});

// ── merge + dedup across providers ────────────────────────────────────────────
test("dedupeJobs removes the same listing surfaced by two providers (same URL)", () => {
  const a = job({ provider: "arbeitnow", externalId: "a", sourceUrl: "https://site.com/jobs/9?utm=x" });
  const b = job({ provider: "jooble", externalId: "jooble-9", sourceUrl: "https://site.com/jobs/9" });
  const out = dedupeJobs([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].provider, "arbeitnow"); // first occurrence kept
});

test("dedupeJobs merges by title+company+location signature", () => {
  const a = job({ provider: "arbeitnow", title: "Frontend Developer", company: "Acme", location: "Berlin", sourceUrl: "https://a/1" });
  const b = job({ provider: "jooble", title: "FRONTEND   developer", company: "acme", location: "berlin", sourceUrl: "https://b/2" });
  assert.equal(jobSignature(a), jobSignature(b));
  assert.equal(dedupeJobs([a, b]).length, 1);
});

test("dedupeJobs does NOT merge distinct company-less jobs sharing title+location", () => {
  const a = job({ company: "", title: "Barista", location: "Berlin", sourceUrl: "https://a/1" });
  const b = job({ company: "", title: "Barista", location: "Berlin", sourceUrl: "https://b/2" });
  assert.equal(dedupeJobs([a, b]).length, 2); // different URLs, no company → kept separate
});

test("dedupeJobs keeps genuinely different jobs", () => {
  const a = job({ title: "Frontend Developer", company: "Acme", sourceUrl: "https://a/1" });
  const b = job({ title: "Backend Developer", company: "Acme", sourceUrl: "https://a/2" });
  assert.equal(dedupeJobs([a, b]).length, 2);
});

// ── failure handling ──────────────────────────────────────────────────────────
const ok = (jobs: NormalizedJob[]): JobProviderResult => ({ ok: true, jobs });
const fail = (code: string): JobProviderResult => ({ ok: false, error: { code, message: "x" } });

test("one provider fails, the other succeeds → ok with the good results", () => {
  const c = combineProviderResults([
    { provider: "arbeitnow", result: fail("provider_timeout") },
    { provider: "jooble", result: ok([job({ provider: "jooble" })]) },
  ]);
  assert.equal(c.ok, true);
  assert.equal(c.jobs.length, 1);
  assert.deepEqual(c.providersOk, ["jooble"]);
  assert.equal(c.providersFailed[0].provider, "arbeitnow");
});

test("all providers fail → not ok, no jobs (→ jobsUnavailable)", () => {
  const c = combineProviderResults([
    { provider: "arbeitnow", result: fail("provider_unreachable") },
    { provider: "jooble", result: fail("provider_not_configured") },
  ]);
  assert.equal(c.ok, false);
  assert.equal(c.jobs.length, 0);
});

test("providers succeed but return nothing → ok with empty jobs (available, not failed)", () => {
  const c = combineProviderResults([
    { provider: "arbeitnow", result: ok([]) },
    { provider: "jooble", result: ok([]) },
  ]);
  assert.equal(c.ok, true);
  assert.equal(c.jobs.length, 0);
  assert.deepEqual(c.providersOk, ["arbeitnow", "jooble"]);
});

test("combine preserves each provider's source + dedupes across them", () => {
  const c = combineProviderResults([
    { provider: "arbeitnow", result: ok([job({ provider: "arbeitnow", title: "PM", company: "A", sourceUrl: "https://x/1" })]) },
    { provider: "jooble", result: ok([
      job({ provider: "jooble", title: "PM", company: "A", location: "Berlin", sourceUrl: "https://y/2" }), // dup by signature
      job({ provider: "jooble", title: "Sales Rep", company: "B", sourceUrl: "https://y/3" }),
    ]) },
  ]);
  // First arbeitnow PM has default location Berlin too → signature dup removes the jooble PM
  assert.ok(c.jobs.some((j) => j.provider === "arbeitnow" && j.title === "PM"));
  assert.ok(c.jobs.some((j) => j.provider === "jooble" && j.title === "Sales Rep"));
  assert.equal(c.jobs.filter((j) => j.title === "PM").length, 1);
});

// ── Prepare Application handoff keeps the provider + source URL ────────────────
test("normalized job carries provider + sourceUrl for the Prepare Application handoff", () => {
  const n = normalizeJoobleJob({ id: 7, title: "Accountant", company: "FinCo", link: "https://jooble.org/desc/7" })!;
  assert.equal(n.provider, "jooble");
  assert.equal(n.sourceUrl, "https://jooble.org/desc/7");
  // the draft built in WorkflowResults reads exactly these fields
  assert.ok(n.externalId && n.sourceUrl && n.provider);
});

// ── secrets: adapter never logs the key / URL ─────────────────────────────────
test("jooble adapter never logs the API key or endpoint URL", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const src = readFileSync(fileURLToPath(new URL("../src/lib/jobs/providers/jooble.ts", import.meta.url)), "utf8");
  assert.ok(!/console\.(log|warn|error)/.test(src), "adapter must not log anything (key is in the URL)");
  assert.ok(/JOOBLE_API_KEY/.test(src) && /process\.env/.test(src), "key read from env only");
});
