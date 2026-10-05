// Phase B Step 1 — Safe AI suggestions / explicit accept-reject.
// The AI Assistant is a fetch/stream React component, so these lock the safety
// contract via source-scan (the same approach used elsewhere in this suite):
// AI never mutates formData before Apply, failures/stale responses change
// nothing, and prompts carry factual-integrity instructions.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/aiSuggestions.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const PANEL = read("../src/app/components/resume-builder/AIAssistantPanel.tsx");

test("AI writes to the résumé in exactly one place — applySuggestion (never during generate/improve)", () => {
  assert.equal((PANEL.match(/onUpdate\(/g) || []).length, 1, "onUpdate called exactly once");
  const apply = PANEL.slice(PANEL.indexOf("const applySuggestion"), PANEL.indexOf("const discardSuggestion"));
  assert.ok(apply.includes("onUpdate(updates)"), "the single onUpdate is inside applySuggestion");
});

test("Generate proposes a suggestion and does not mutate formData", () => {
  const gen = PANEL.slice(PANEL.indexOf("const handleGenerate"), PANEL.indexOf("const handleImprove"));
  assert.ok(gen.includes("setSuggestion({"), "generate sets a suggestion");
  assert.ok(!gen.includes("onUpdate("), "generate never calls onUpdate");
});

test("Improve streams into a suggestion preview and does not mutate formData", () => {
  const imp = PANEL.slice(PANEL.indexOf("const handleImprove"), PANEL.indexOf("const applySuggestion"));
  assert.ok(imp.includes("showStreaming") && imp.includes("setSuggestion"), "improve builds a suggestion");
  assert.ok(!imp.includes("onUpdate("), "improve never calls onUpdate");
});

test("Apply maps only to the intended targets; Discard changes nothing", () => {
  const apply = PANEL.slice(PANEL.indexOf("const applySuggestion"), PANEL.indexOf("const discardSuggestion"));
  for (const t of ['ch.target === "summary"', 'ch.target === "jobTitle"', 'ch.target === "skills"', 'ch.target === "experience"']) {
    assert.ok(apply.includes(t), `applies to ${t}`);
  }
  assert.ok(PANEL.includes("const discardSuggestion = () => setSuggestion(null);"), "Discard only clears the suggestion");
  assert.ok(PANEL.includes("↻ Try again") || PANEL.includes("Try again"), "Try again control present");
});

test("Failed AI call changes nothing (no onUpdate in catch; suggestion cleared)", () => {
  // Both handlers clear the suggestion on error and never write to the résumé.
  assert.ok((PANEL.match(/setSuggestion\(null\)/g) || []).length >= 3, "suggestion cleared on discard + error paths");
  assert.ok(PANEL.includes('catch (err)'), "errors are caught");
});

test("Stale-response + double-click guards exist", () => {
  assert.ok(PANEL.includes("reqIdRef"), "monotonic request id");
  assert.ok((PANEL.match(/reqIdRef\.current !== myReq/g) || []).length >= 2, "stale responses are ignored");
  assert.ok((PANEL.match(/if \(busy\) return;/g) || []).length >= 2, "double-click / concurrent request guarded");
  assert.ok(PANEL.includes("suggestion.base"), "stale detection compares against a request-time snapshot");
});

test("No automatic Supabase save from the AI panel", () => {
  assert.ok(!/supabase/i.test(PANEL), "AI panel does not touch Supabase");
  assert.ok(!PANEL.includes(".from("), "no DB writes in the AI panel");
});

test("AI prompts carry factual-integrity instructions", () => {
  const gen = read("../src/app/api/resume/generate/route.ts");
  const imp = read("../src/app/api/resume/improve/route.ts");
  assert.ok(gen.includes("FACTUAL INTEGRITY"), "generate route has integrity clause");
  assert.ok(/do not invent|Do NOT invent|never fabricate/i.test(gen), "generate forbids fabrication");
  assert.ok(imp.includes("FACTUAL INTEGRITY"), "improve route has integrity clause");
  assert.ok(/Never invent|do not add unsupported/i.test(imp), "improve forbids invented facts");
});
