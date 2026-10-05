// Phase A.2 — Resume Builder UX completion: success feedback + dictation.
// Pure-logic tests for the dictation text merge/error mapping, plus source-scans
// that lock in the feedback copy, real-result integrity, and voice safety.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/resumeUx.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { mergeDictatedText, dictationErrorMessage } from "@/lib/resume/useDictation";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

// ── Dictation text merge (preserve existing, never overwrite) ────────────────
test("mergeDictatedText preserves existing text and appends", () => {
  assert.equal(mergeDictatedText("", "Hello world"), "Hello world");
  assert.equal(mergeDictatedText("Existing", "added"), "Existing added");
  assert.equal(mergeDictatedText("Existing ", "added"), "Existing added"); // no double space
  assert.equal(mergeDictatedText("Line one\n", "Line two"), "Line one\nLine two");
  assert.equal(mergeDictatedText("Keep me", "   "), "Keep me"); // empty addition → unchanged
  assert.equal(mergeDictatedText("Keep me", ""), "Keep me");
});

// ── Error mapping ────────────────────────────────────────────────────────────
test("dictationErrorMessage maps codes to clear copy", () => {
  assert.match(dictationErrorMessage("not-allowed"), /Microphone access was blocked/);
  assert.match(dictationErrorMessage("service-not-allowed"), /Microphone access was blocked/);
  assert.match(dictationErrorMessage("audio-capture"), /No microphone/);
  assert.match(dictationErrorMessage("no-speech"), /No speech detected/);
  assert.match(dictationErrorMessage("network"), /speech service/i);
  assert.equal(dictationErrorMessage("aborted"), ""); // user-initiated stop → silent
  assert.match(dictationErrorMessage("weird-unknown"), /unexpectedly/);
});

// ── Voice safety: no backend audio; standard API; single session; teardown ───
test("useDictation never sends audio to a backend and cleans up", () => {
  const src = read("../src/lib/resume/useDictation.ts");
  assert.ok(!/\bfetch\s*\(/.test(src), "no fetch() in dictation hook");
  assert.ok(!/XMLHttpRequest|WebSocket|navigator\.sendBeacon/.test(src), "no network transport");
  assert.ok(src.includes("SpeechRecognition") && src.includes("webkitSpeechRecognition"),
    "uses the standard Web Speech API");
  assert.ok(src.includes("if (recRef.current) cleanup();"), "single active session enforced");
  assert.ok(src.includes("useEffect(() => cleanup"), "aborts recognition on unmount");
  assert.ok(src.includes("rec.abort()"), "recognition is aborted on teardown");
});

// ── Dictation is wired to long-form fields only ──────────────────────────────
test("dictation covers long-form + primary text fields via ONE shared session", () => {
  const form = read("../src/app/components/resume-builder/ResumeForm.tsx");
  assert.ok(form.includes('from "@/app/components/resume-builder/DictatableInput"'), "uses DictatableInput");
  assert.equal((form.match(/useDictation\(\)/g) || []).length, 1, "exactly one shared dictation controller");
  assert.ok(form.includes("dictateSummary") && form.includes("dictateExp"), "summary + experience textareas dictatable");
  assert.ok((form.match(/<DictatableInput/g) || []).length >= 6, "dictation across many text fields");
  assert.ok(form.includes('PERSONAL_DICTATE = new Set(["fullName", "jobTitle", "location"])'),
    "only name/title/location among personal fields are dictatable");
  assert.ok(!/PERSONAL_DICTATE[^\)]*email/.test(form), "email excluded from dictation");
  assert.ok(!/PERSONAL_DICTATE[^\)]*phone/.test(form), "phone excluded from dictation");
  assert.ok(form.includes("<select"), "proficiency stays a select (no mic)");
  assert.ok(!form.includes("setActiveMic"), "old cosmetic activeMic state removed");
});

test("DictatableInput appends (never overwrites) via a stale-safe ref and shared toggle", () => {
  const c = read("../src/app/components/resume-builder/DictatableInput.tsx");
  assert.ok(c.includes("mergeDictatedText(valueRef.current"), "appends using the latest field value");
  assert.ok(c.includes("dictation.toggle(id"), "uses the shared controller keyed by field id");
});

test("Toast renders through a body portal, above the app UI", () => {
  const t = read("../src/app/components/ui/Toast.tsx");
  assert.ok(t.includes("createPortal"), "uses a React portal");
  assert.ok(t.includes("document.body"), "portalled onto document.body (escapes overflow/stacking)");
  assert.ok(/z-\[\d{4,}\]/.test(t), "very high z-index");
  assert.ok(t.includes("role=") && t.includes("aria-live"), "accessible live region");
});

// ── Save feedback reflects the real DB result (not optimistic) ───────────────
test("save shows success only after the Supabase write", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(src.includes('"Résumé saved successfully."'), "success message present");
  const save = src.slice(src.indexOf("const handleSave"), src.indexOf("const handleDownload"));
  const dbIdx = save.indexOf('.from("resumes")');
  const okIdx = save.indexOf('"Résumé saved successfully."');
  assert.ok(dbIdx > -1 && okIdx > dbIdx, "success toast comes AFTER the DB call");
  assert.ok(save.includes("resetErrorAfterDelay") || save.includes('"error"'), "failure path shows an error");
});

// ── Import feedback distinguishes import / merge / replace ────────────────────
test("import feedback has distinct import/merge/replace messages", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(src.includes('"Résumé imported successfully."'), "import message");
  assert.ok(src.includes('"Résumé merged successfully."'), "merge message");
  assert.ok(src.includes('"Résumé replaced successfully."'), "replace message");
  const panel = read("../src/app/components/resume-builder/ResumeImportPanel.tsx");
  assert.ok(/onApply:\s*\(next: ResumeFormData, mode:/.test(panel), "panel passes the mode to onApply");
});

// ── Copy feedback ────────────────────────────────────────────────────────────
test("copy shows real success/failure messages", () => {
  const exp = read("../src/app/components/resume-builder/ExportSection.tsx");
  assert.ok(exp.includes('"Résumé copied to clipboard."'), "copy success message");
  assert.ok(!exp.includes('"Resume text copied"'), "old copy message replaced");
  assert.ok(/Couldn't copy résumé text/.test(exp), "copy failure message");
});

// ── PDF never claims a saved file ────────────────────────────────────────────
test("PDF export announces opening the dialog, never claims a saved file", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(src.includes('"PDF export opened."'), "neutral PDF message present");
  assert.ok(!/PDF saved|saved as PDF|résumé saved as pdf/i.test(src), "never claims the PDF was saved");
});

// ── Toast is accessible ──────────────────────────────────────────────────────
test("Toast exposes an accessible live-region role", () => {
  const t = read("../src/app/components/ui/Toast.tsx");
  assert.ok(t.includes("role=") && t.includes("aria-live"), "toast has role + aria-live");
});
