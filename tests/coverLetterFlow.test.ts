// Source-scan contract tests for the Cover Letter final product flow (Step 3):
// editable body, canonical copy, save (current body + real fields, update-vs-
// insert), reopen (stored data only), and /ai-workflow non-regression.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/coverLetterFlow.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT  = read("../src/app/components/cover-letter/CoverLetterClient.tsx");
const PREVIEW = read("../src/app/components/cover-letter/CoverLetterPreview.tsx");
const PAGE    = read("../src/app/cover-letter/page.tsx");
const SAVED   = read("../src/app/components/dashboard/SavedCoverLetters.tsx");

test("generated letter body is directly editable and bound to one body state", () => {
  assert.ok(/<textarea[\s\S]*value=\{body\}/.test(CLIENT), "textarea is controlled by the body state");
  assert.ok(/onChange=\{\(e\) => setBody\(e\.target\.value\)\}/.test(CLIENT), "manual edits update the body");
  assert.ok(/disabled=\{isGenerating\}/.test(CLIENT), "editing is paused only during generation");
});

test("manual edits reach the preview (preview renders the same body)", () => {
  assert.ok(/<CoverLetterPreview[^>]*aiContent=\{body\}/.test(CLIENT), "preview receives the live body");
  assert.ok(/aiContent/.test(PREVIEW), "preview renders aiContent");
});

test("Copy produces the COMPLETE letter via the canonical builder, not just the body", () => {
  assert.ok(/buildFullLetter\(formData, body\)/.test(CLIENT), "copy builds the full letter from identity + body");
  assert.ok(/import \{ buildFullLetter \}/.test(CLIENT), "uses the canonical builder");
});

test("Save stores the current edited body and real company/role — not generic defaults when available", () => {
  assert.ok(/content:\s*body/.test(CLIENT), "saves the current edited body");
  assert.ok(/company_name:\s*formData\.company\.trim\(\)/.test(CLIENT), "uses the real company when available");
  assert.ok(/job_title:\s*formData\.jobTitle\.trim\(\)/.test(CLIENT), "uses the real target role when available");
  assert.ok(!/\|\|\s*"Job Application"/.test(CLIENT), "no 'Job Application' generic default");
  assert.ok(!/\|\|\s*"Cover Letter"/.test(CLIENT), "no 'Cover Letter' generic job-title default");
});

test("Save updates the reopened/just-saved record instead of duplicating rows", () => {
  assert.ok(/if \(editingId\)/.test(CLIENT), "branches on an existing record id");
  assert.ok(/\.update\(payload\)[\s\S]*\.eq\("id", editingId\)/.test(CLIENT), "updates that record");
  assert.ok(/setEditingId\(\(data as \{ id: string \}\)\.id\)/.test(CLIENT), "captures the id after a first insert so repeat saves update");
  assert.ok(/\.eq\("user_id", session\.user\.id\)/.test(CLIENT), "update stays owner-scoped (RLS + explicit)");
});

test("reopen loads ONLY genuinely stored fields and never fabricates identity", () => {
  assert.ok(/initialLetterId/.test(CLIENT), "accepts a letter id to reopen");
  assert.ok(/\.from\("cover_letters"\)[\s\S]*\.select\("id, company_name, job_title, language, content"\)/.test(CLIENT), "selects only stored columns");
  assert.ok(/\.eq\("id", initialLetterId\)[\s\S]*\.eq\("user_id", session\.user\.id\)/.test(CLIENT), "owner-scoped read");
  assert.ok(/setBody\(row\.content/.test(CLIENT), "stored content loads into the editable body");
  // Identity columns don't exist — reopen must not set name/email/phone from the row.
  assert.ok(!/fullName:\s*row\./.test(CLIENT) && !/email:\s*row\./.test(CLIENT), "no identity reconstructed from storage");
});

test("old saved rows stay compatible (language falls back if not a known option)", () => {
  assert.ok(/isLanguageOption\(row\.language\)\s*\?\s*row\.language\s*:\s*prev\.language/.test(CLIENT), "unknown stored language degrades safely");
});

test("reopen entry points are wired (page param + dashboard Edit for real rows only)", () => {
  assert.ok(/searchParams:\s*Promise<\{\s*id\?:/.test(PAGE), "page reads the id search param");
  assert.ok(/initialLetterId=\{id\}/.test(PAGE), "passes it to the client");
  assert.ok(/href=\{`\/cover-letter\?id=\$\{letter\.id\}`\}/.test(SAVED), "dashboard links to reopen");
  assert.ok(/!letter\.id\.startsWith\("wf-"\)/.test(SAVED), "synthetic workflow rows are not editable");
});

test("no fake/sample identity regression in the standalone surface", () => {
  for (const src of [CLIENT, PREVIEW]) {
    assert.ok(!/alex\.chen/.test(src) && !/555-0182/.test(src) && !/San Francisco, CA/.test(src) && !/"Your Name"/.test(src), "no sample identity");
  }
});

test("/ai-workflow remains untouched by this step", () => {
  // Standalone tool uses its own route; shared /generate + the ai-workflow catalog are unchanged.
  assert.ok(CLIENT.includes('authedFetch("/api/cover-letter/standalone"'), "client uses the standalone route");
  assert.ok(!CLIENT.includes("/api/cover-letter/generate"), "client never calls the shared /generate route");
  const GENERATE = read("../src/app/api/cover-letter/generate/route.ts");
  assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(GENERATE), "generate route still exports POST");
  const WORKFLOWS = read("../src/app/components/ai-workflow/workflows.ts");
  assert.ok(WORKFLOWS.includes('route: "/api/cover-letter/generate"'), "ai-workflow catalog still points at /generate");
});
