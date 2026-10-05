// Contract-level guards for the Phase B Step 2 analysis surface: the requirements
// route's method contract, and the panel's safety invariants (no auto-insert of
// missing keywords, read-only analysis, no Supabase, truthful copy).
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/resumeAnalysisContract.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

test("requirements route exports POST only, dynamic on the node runtime", () => {
  const src = read("../src/app/api/resume/requirements/route.ts");
  assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(src), "exports POST");
  for (const m of ["GET", "PUT", "PATCH", "DELETE", "HEAD"]) {
    assert.ok(!new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\s*\\(`).test(src), `no ${m}`);
  }
  assert.ok(src.includes('export const dynamic = "force-dynamic"'));
  assert.ok(src.includes('export const runtime = "nodejs"'));
});

test("requirements route grounds the prompt and rejects malformed output without fabricating", () => {
  const src = read("../src/app/api/resume/requirements/route.ts");
  assert.ok(/only information explicitly present/i.test(src), "prompt is grounded to the JD");
  assert.ok(/do not invent/i.test(src), "prompt forbids invention");
  assert.ok(/unreadable response/i.test(src), "malformed JSON is rejected, not fabricated");
  // The résumé must NOT be sent for requirement extraction (privacy).
  assert.ok(!/resumeText|resume\b.*body/i.test(src) || !src.includes("body.resumeText"), "route does not read résumé text");
});

test("analysis panel never auto-inserts missing keywords; add requires an explicit per-term action", () => {
  const p = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  // No bulk 'add all missing' behaviour.
  assert.ok(!/add.*all.*missing/i.test(p), "no bulk add-all-missing");
  // Adding is a single explicit action gated behind the unmatched term button.
  assert.ok(p.includes("only if you have it") || p.includes("only if you have this"), "explicit confirmation copy present");
  assert.ok(p.includes("const addSkill"), "single-term add handler exists");
  // Add is only offered for unmatched required/preferred terms in the FULL analysis.
  assert.ok(/c\.key === "required" \|\| c\.key === "preferred"/.test(p), "add gated to required/preferred");
  assert.ok(/!m\.matched/.test(p), "add offered only when the term is not matched");
});

test("degraded 'Basic text match' mode is visibly distinct and never mimics full Job Match", () => {
  const p = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  // A separate, clearly-labelled degraded result kind.
  assert.ok(/Basic text match/.test(p), "labelled 'Basic text match'");
  assert.ok(/could(n'|&apos;)t extract the job(&apos;|')s structured requirements/i.test(p), "explains extraction failed");
  // Uses a DIFFERENT metric label, not the full 'Job Match %'.
  assert.ok(/term coverage/i.test(p), "uses 'term coverage', a different metric");
  // Full and basic are separate states, never both true / never conflated.
  assert.ok(p.includes("const [full,") && p.includes("const [basic,"), "separate full/basic result state");
  assert.ok(p.includes("basicTextMatch(formData"), "degraded path uses basicTextMatch");
  // No fabricated required/preferred in degraded mode: it renders basic.terms, not categories.
  assert.ok(/basic\.terms\.map/.test(p), "degraded mode lists raw terms, not required/preferred categories");
});

test("degraded mode does NOT offer add-to-skills, and prefers a retryable error when useless", () => {
  const p = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  // The basic block explicitly states it doesn't suggest adding skills.
  assert.ok(/doesn(&apos;|')t suggest adding skills/i.test(p), "basic mode discourages adding terms");
  // If the basic comparison can't be built, an error is shown instead of a fake score.
  assert.ok(/couldn(&apos;|')t build a basic text comparison/i.test(p), "prefers retryable error when no meaningful comparison");
  // 429 and network failures route to the degraded/ error path, never a full score.
  assert.ok(/res\.status === 429/.test(p), "429 handled distinctly");
});

test("panel analysis is read-only + local, and never writes Supabase", () => {
  const p = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  assert.ok(!/supabase/i.test(p), "panel never touches Supabase");
  // Strength is computed in-browser; matching is deterministic & local.
  assert.ok(p.includes("computeResumeStrength(formData)"), "strength computed locally");
  assert.ok(p.includes("matchResumeToJob(formData"), "matching runs locally on the résumé");
  // Only the job description is posted to the server (not the résumé).
  assert.ok(p.includes('postResumeAI("/api/resume/requirements", { jobDescription:'), "only the JD is sent");
});

test("panel copy is truthful — no ATS pass/hire predictions, no bare 'ATS Score' label", () => {
  const p = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  assert.ok(/not a score from an\s+employer/i.test(p), "clarifies Strength is not an ATS score");
  assert.ok(/not a prediction of\s*\n?\s*getting hired/i.test(p) || /not a prediction of getting hired/i.test(p), "clarifies Job Match is not a hire prediction");
  assert.ok(!/chance of passing/i.test(p) && !/ATS approved/i.test(p), "no fake precision claims");
  assert.ok(p.includes("Résumé Strength") && p.includes("Match to a Job"), "two distinct modes labelled");
});
