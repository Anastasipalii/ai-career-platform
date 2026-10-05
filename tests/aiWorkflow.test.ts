// Regression tests that LOCK the /ai-workflow current-release guarantees:
// (1) real-job identity can never be fabricated by the ranking boundary, and
// (2) workflow/application persistence is owner-scoped + idempotent and never
// implies an external submission.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/aiWorkflow.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectDomainMatches, MIN_MATCH_SCORE } from "@/lib/jobs/relevance";
import { MOCK_OUTPUTS } from "@/app/components/ai-workflow/mockOutputs";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const AGENT  = read("../src/app/api/job-match/agent/route.ts");
const CANVAS = read("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
const WFRUN  = read("../src/lib/workflowRun.ts");
const APPRUN = read("../src/lib/application/applicationRun.ts");

// ── PROVIDER IDENTITY — behavioural (pure selection boundary) ─────────────────
test("selectDomainMatches can reorder/drop but never invents a job id", () => {
  const exactIds = new Set(["a", "b"]);
  const ranked = [
    { externalId: "a", matchScore: 90 },
    { externalId: "b", matchScore: 30 }, // below MIN_MATCH_SCORE → dropped
    { externalId: "c", matchScore: 80 }, // adjacent (not exact) but qualifies
  ];
  const out = selectDomainMatches(ranked, exactIds);
  const inputIds = new Set(ranked.map((r) => r.externalId));
  // Every surviving id came from the input — nothing fabricated.
  for (const m of out) assert.ok(inputIds.has(m.externalId), "no invented id");
  // The sub-threshold exact job (b@30) is dropped.
  assert.ok(!out.some((m) => m.externalId === "b"), "below MIN_MATCH_SCORE dropped");
  assert.ok(out.some((m) => m.externalId === "a"), "qualifying exact kept");
  assert.equal(MIN_MATCH_SCORE, 40);
});

test("selectDomainMatches on empty ranking returns nothing (no fabricated fallback)", () => {
  assert.deepEqual(selectDomainMatches([], new Set<string>()), []);
});

test("MOCK_OUTPUTS is a neutral empty scaffold — no fabricated jobs or candidate data", () => {
  assert.deepEqual(MOCK_OUTPUTS.jobMatches, []);
  assert.equal(MOCK_OUTPUTS.ats.score, 0);
  assert.deepEqual(MOCK_OUTPUTS.missingSkills, []);
  assert.equal(MOCK_OUTPUTS.coverLetter.company, "");
});

// ── PROVIDER IDENTITY — ranking route contract (source) ───────────────────────
test("job-match agent whitelists provider ids and never invents jobs", () => {
  assert.ok(/byId\.get\(id\)/.test(AGENT) && /discard any invented id/.test(AGENT), "AI ids are whitelisted to real provider jobs");
  assert.ok(/NEVER invent jobs, companies, titles, URLs/.test(AGENT), "prompt forbids invention");
  // Identity fields in a match are taken from the provider job object.
  assert.ok(/externalId:\s*job\.externalId/.test(AGENT) && /provider:\s*job\.provider/.test(AGENT), "identity sourced from the provider job");
  // No real jobs supplied → empty set, never a fabricated fallback.
  assert.ok(/json\("provider-only", \[\]\)/.test(AGENT), "no real jobs → empty, not fabricated");
});

test("workflow ranks only real qualified jobs and never fabricates on provider failure", () => {
  assert.ok(/jobs:\s*qualified/.test(CANVAS), "only domain-qualified REAL jobs are ranked");
  assert.ok(/jobsUnavailable = true/.test(CANVAS), "provider failure → truthful unavailable, not fabricated jobs");
  assert.ok(/mapToOutputs\(analysis, cover, matches/.test(CANVAS), "results use the real ranked matches");
  // The empty demo path uses MOCK_OUTPUTS, which carries no fabricated jobs.
  assert.ok(/WorkflowOutputs = MOCK_OUTPUTS/.test(CANVAS), "demo path uses the neutral scaffold");
});

// ── PERSISTENCE — owner-scoped + idempotent (source) ──────────────────────────
test("workflow persistence is owner-scoped and idempotent on run_key", () => {
  // Idempotent create + save keyed on run_key (no duplicate logical runs).
  assert.ok(/onConflict:\s*"run_key",\s*ignoreDuplicates:\s*true/.test(WFRUN), "create upserts on run_key, ignoring duplicates");
  assert.ok(/\{ onConflict:\s*"run_key" \}/.test(WFRUN), "save upserts on run_key");
  // Every mutating/reading query is scoped to the authenticated user.
  assert.ok(WFRUN.includes('.eq("user_id", uid)'), "owner-scoped writes/reads");
  // Updates target the run by run_key AND user_id together.
  assert.ok(/\.eq\("run_key", params\.runKey\)\s*\n?\s*\.eq\("user_id", uid\)/.test(WFRUN), "updates keyed by run_key + user_id");
});

test("application persistence is owner-scoped, dry-run-locked, and never submits", () => {
  assert.ok(/is_dry_run:\s*IS_DRY_RUN/.test(APPRUN), "rows are hardcoded dry-run");
  assert.ok(!/is_dry_run:\s*false/.test(APPRUN), "never writes a non-dry-run row");
  assert.ok(/\.eq\("application_run_key", params\.applicationRunKey\)\s*\n?\s*\.eq\("user_id", uid\)/.test(APPRUN), "updates owner-scoped");
  assert.ok(/\.eq\("user_id", uid\)/.test(APPRUN), "reads owner-scoped");
  // Persistence performs no external submission of any kind.
  assert.ok(!/\bfetch\(/.test(APPRUN) && !/https?:\/\/(?!localhost)/.test(APPRUN), "no network/external submission in persistence");
});
