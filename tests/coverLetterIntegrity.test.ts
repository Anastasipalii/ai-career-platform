// Factual-integrity + real-user-data contract tests for the STANDALONE Cover
// Letter tool (Cover Letter Step 2). Source-scan where behavior depends on
// client/route code that can't run headlessly. Also guards that the shared
// /ai-workflow /generate route and contract are NOT changed by this step.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/coverLetterIntegrity.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const STANDALONE = read("../src/app/api/cover-letter/standalone/route.ts");
const GENERATE   = read("../src/app/api/cover-letter/generate/route.ts");
const CLIENT     = read("../src/app/components/cover-letter/CoverLetterClient.tsx");
const PREVIEW    = read("../src/app/components/cover-letter/CoverLetterPreview.tsx");
const UPLOAD     = read("../src/app/components/cover-letter/ResumeUpload.tsx");

// ── Factual integrity of the standalone generation prompt ─────────────────────
test("standalone route never instructs the model to invent facts", () => {
  assert.ok(!/invent realistic examples/i.test(STANDALONE), "must not tell the model to invent examples");
  assert.ok(/NEVER invent|never invent|must NEVER/i.test(STANDALONE), "has an explicit no-invention rule");
  // Names the categories it must not invent.
  for (const kw of ["employers", "achievements", "metrics", "certifications", "education"]) {
    assert.ok(new RegExp(kw, "i").test(STANDALONE), `no-invention rule covers ${kw}`);
  }
  assert.ok(/sparse/i.test(STANDALONE) && /general/i.test(STANDALONE), "falls back to a truthful general letter when background is sparse");
});

test("the standalone tool calls the standalone route, not the shared /generate route", () => {
  assert.ok(CLIENT.includes('authedFetch("/api/cover-letter/standalone"'), "client posts to the standalone route");
  assert.ok(!CLIENT.includes("/api/cover-letter/generate"), "client no longer calls the shared /generate route");
});

test("generation receives actual candidate background (résumé text + identity)", () => {
  // Client sends the extracted résumé text and identity fields.
  for (const field of ["resumeText:", "fullName:", "email:", "phone:", "location:", "targetRole:", "company:"]) {
    assert.ok(CLIENT.includes(field), `client payload includes ${field}`);
  }
  // Route actually consumes the résumé text as the factual source.
  assert.ok(/resumeText/.test(STANDALONE), "route reads resumeText");
  assert.ok(/RÉSUMÉ|RESUME|résumé|background/i.test(STANDALONE), "route grounds the letter in the résumé/background");
});

// ── No fake / sample identity anywhere in the standalone surface ──────────────
test("all hardcoded sample identity is gone", () => {
  for (const src of [PREVIEW, CLIENT, UPLOAD]) {
    assert.ok(!/alex\.chen/i.test(src), "no alex.chen sample email");
    assert.ok(!/555-0182/.test(src), "no sample phone");
    assert.ok(!/San Francisco, CA/.test(src), "no sample location");
    assert.ok(!/"Your Name"|'Your Name'|>Your Name</.test(src), "no 'Your Name' placeholder identity");
  }
});

test("preview renders real identity from state and omits blanks (no fabrication)", () => {
  assert.ok(/formData\.fullName/.test(PREVIEW), "name from state");
  assert.ok(/formData\.email/.test(PREVIEW) && /formData\.phone/.test(PREVIEW) && /formData\.location/.test(PREVIEW), "contacts from state");
  // Contact row is built by filtering out empty values.
  assert.ok(/\.filter\(Boolean\)/.test(PREVIEW), "blank identity fields are filtered out, not shown as placeholders");
});

test("résumé upload is functional: parses client-side and reports extracted data up", () => {
  assert.ok(/parseResumeFile/.test(UPLOAD), "uses the shared client-side parser");
  assert.ok(/extractCandidateIdentity/.test(UPLOAD), "derives identity for prefill");
  assert.ok(/onParsed/.test(UPLOAD), "passes extracted text + identity to the parent");
  // Raw bytes are not uploaded by the component (no fetch/XHR of the file).
  assert.ok(!/fetch\(/.test(UPLOAD), "component does not upload the file");
});

// ── Server validation / error hygiene ─────────────────────────────────────────
test("standalone route allow-lists tone/language and hides raw errors", () => {
  assert.ok(/TONE_OPTIONS/.test(STANDALONE) && /LANGUAGE_OPTIONS/.test(STANDALONE), "validates tone & language against allow-lists");
  assert.ok(/DEFAULT_TONE|DEFAULT_LANGUAGE/.test(STANDALONE), "falls back to safe defaults");
  // err.message may be inspected to classify a 429, but must never be placed in a response.
  for (const call of STANDALONE.match(/errorJson\([^;]*?\)/g) || []) {
    assert.ok(!/\.message/.test(call), "no errorJson() returns a raw exception message");
  }
  assert.ok(/Please try again/i.test(STANDALONE), "uses a friendly generic failure message");
  assert.ok(/429/.test(STANDALONE), "preserves friendly 429 handling");
  assert.ok(/slice\(0,/.test(STANDALONE), "applies input-size caps");
  assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(STANDALONE), "exports POST");
});

// ── /ai-workflow contract protection — the shared route is unchanged ──────────
test("shared /generate route and the /ai-workflow catalog entry are not altered by this step", () => {
  // The standalone step must not weaken or rewire the route /ai-workflow references.
  assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(GENERATE), "generate still exports POST");
  assert.ok(/jobDescription/.test(GENERATE), "generate still accepts the same primary input");
  // The ai-workflow catalog still points at /api/cover-letter/generate.
  const WORKFLOWS = read("../src/app/components/ai-workflow/workflows.ts");
  assert.ok(WORKFLOWS.includes('route: "/api/cover-letter/generate"'), "ai-workflow still routes to /generate unchanged");
});
