// Phase C Step 1.2 — Unsaved-changes protection.
// Behavioral tests for the pure dirty-state semantics (serializeResumeState /
// isResumeDirty), plus source contracts for the guard wiring in the client
// (which can't render headlessly).
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/unsavedChanges.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serializeResumeState, isResumeDirty } from "@/lib/resume/dirtyState";
import { withFormDataDefaults } from "@/lib/resume/importResume";
import type { ResumeFormData, CustomizationSettings, TemplateKey } from "@/app/components/resume-builder/types";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
const CONFIRM = read("../src/app/components/resume-builder/ConfirmDialog.tsx");

const S: CustomizationSettings = { colorTheme: "Purple Neon", font: "Minimal", layout: "One-column", spacing: "Balanced" };
const T: TemplateKey = "Creative";
const empty = (): ResumeFormData => withFormDataDefaults({});
// Simulate the builder: baseline is set whenever we reach a "safe" state.
const baselineOf = (f: ResumeFormData, s = S, t = T) => serializeResumeState(f, s, t);

// ── Baselines ────────────────────────────────────────────────────────────────
test("a new empty résumé is clean", () => {
  const f = empty();
  assert.equal(isResumeDirty(baselineOf(f), f, S, T), false);
});

test("a freshly loaded saved résumé is clean (baseline = its serialization)", () => {
  const loaded = withFormDataDefaults({ fullName: "Nastya", skills: ["React"] });
  const base = baselineOf(loaded);
  assert.equal(isResumeDirty(base, loaded, S, T), false);
});

test("successful Save establishes a clean baseline; a later change makes it dirty again", () => {
  let f = withFormDataDefaults({ fullName: "A" });
  const base = baselineOf(f);               // save success
  assert.equal(isResumeDirty(base, f, S, T), false);
  f = { ...f, summary: "new" };             // an edit after save
  assert.equal(isResumeDirty(base, f, S, T), true);
});

test("failed Save keeps the résumé dirty (baseline is NOT reset)", () => {
  const base = baselineOf(empty());         // last clean baseline
  const edited = withFormDataDefaults({ fullName: "Edited but save failed" });
  // On failure the component returns early without updating the baseline:
  assert.equal(isResumeDirty(base, edited, S, T), true);
});

// ── What marks dirty ──────────────────────────────────────────────────────────
test("a form edit marks dirty", () => {
  const base = baselineOf(empty());
  assert.equal(isResumeDirty(base, withFormDataDefaults({ jobTitle: "PM" }), S, T), true);
});

test("a settings or template change marks dirty", () => {
  const f = empty();
  const base = baselineOf(f);
  assert.equal(isResumeDirty(base, f, { ...S, colorTheme: "Navy Blue" }, T), true, "settings");
  assert.equal(isResumeDirty(base, f, S, "Corporate"), true, "template");
});

test("a project or certification edit marks dirty", () => {
  const base = baselineOf(empty());
  const withProject = withFormDataDefaults({
    projects: [{ id: "p1", name: "Boho Padel", role: "", startDate: "", endDate: "", current: false, description: "Booking", url: "" }],
  });
  assert.equal(isResumeDirty(base, withProject, S, T), true, "project");
  const withCert = withFormDataDefaults({
    certifications: [{ id: "c1", name: "AWS SAA", issuer: "Amazon", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "" }],
  });
  assert.equal(isResumeDirty(base, withCert, S, T), true, "certification");
});

test("AI Apply / import Apply mark dirty (formData changed); generation / review / discard / view do not", () => {
  const f = withFormDataDefaults({ summary: "orig" });
  const base = baselineOf(f);
  // Generation, review, discard, and opening/closing View change no résumé content:
  assert.equal(isResumeDirty(base, f, S, T), false, "no content change → clean");
  // Apply (AI or import) changes formData → dirty:
  assert.equal(isResumeDirty(base, { ...f, summary: "AI applied" }, S, T), true, "AI apply");
  assert.equal(isResumeDirty(base, { ...f, skills: [...f.skills, "GraphQL"] }, S, T), true, "import apply");
});

// ── Guard wiring (source contracts) ──────────────────────────────────────────
test("Edit from My Resumes and from the View modal both go through the dirty guard", () => {
  assert.ok(/onOpen=\{requestLoadRecord\}/.test(CLIENT), "My Resumes Edit is guarded");
  assert.ok(/const requestLoadRecord = \(record: SavedResumeRecord\) => \{[\s\S]*if \(isDirty\) setPendingLoad\(record\);[\s\S]*else loadRecord\(record\);/.test(CLIENT), "guard: dirty → confirm, else load");
  assert.ok(/if \(current\) requestLoadRecord\(current\.record\)/.test(CLIENT), "View-modal Edit is guarded too");
  assert.ok(/const isDirty = serializeResumeState\(formData, settings, selectedTemplate\) !== baseline;/.test(CLIENT), "isDirty derived from baseline");
});

test("Save success sets the baseline; a failed save returns before that", () => {
  const save = CLIENT.slice(CLIENT.indexOf("const handleSave"), CLIENT.indexOf("const handleDownload"));
  assert.ok(/setBaseline\(serializeResumeState\(formData, settings, selectedTemplate\)\)/.test(save), "baseline set on success");
  // The success baseline line comes AFTER the early-return error paths.
  assert.ok(save.indexOf("resetErrorAfterDelay") < save.indexOf("setBaseline("), "failures return before baseline reset");
});

test("loadRecord and delete-reset both re-establish a clean baseline", () => {
  assert.ok(/setBaseline\(serializeResumeState\(nextFormData, nextSettings, nextTemplate\)\)/.test(CLIENT), "load sets baseline");
  assert.ok(/setBaseline\(serializeResumeState\(INITIAL_FORM_DATA, INITIAL_SETTINGS, "Creative"\)\)/.test(CLIENT), "delete-reset sets clean baseline");
});

test("opening/closing View never touches baseline or pendingLoad (stays clean)", () => {
  const start = CLIENT.indexOf("const handleView = useCallback");
  const hv = CLIENT.slice(start, CLIENT.indexOf("}, []);", start)); // handleView body only
  assert.ok(!hv.includes("setBaseline") && !hv.includes("setPendingLoad"), "View open sets neither");
  assert.ok(!hv.includes("setFormData(") && !hv.includes("setResumeId("), "View open does not load into the builder");
  assert.ok(hv.includes("setViewState({"), "View only sets its own state");
});

// ── Confirmation dialog ──────────────────────────────────────────────────────
test("a single shared ConfirmDialog guards the destructive replacement with clear copy", () => {
  assert.ok(/pendingLoad &&/.test(CLIENT), "confirm shown only when a load is pending");
  assert.ok(/You have unsaved changes\. If you continue, those changes will be lost\./.test(CLIENT), "clear message");
  assert.ok(/confirmLabel="Discard changes and continue"/.test(CLIENT), "destructive action labelled");
  assert.ok(/onConfirm=\{confirmPendingLoad\}/.test(CLIENT) && /onCancel=\{\(\) => setPendingLoad\(null\)\}/.test(CLIENT), "confirm loads, cancel preserves");
  // confirmPendingLoad loads the pending record; cancel just clears it.
  assert.ok(/const confirmPendingLoad = \(\) => \{[\s\S]*if \(rec\) loadRecord\(rec\);/.test(CLIENT), "confirm performs the requested load");
});

test("ConfirmDialog is accessible: alertdialog, Escape = cancel, cancel auto-focused & default", () => {
  assert.ok(/role="alertdialog"/.test(CONFIRM) && /aria-modal="true"/.test(CONFIRM), "dialog semantics");
  assert.ok(/e\.key === "Escape"/.test(CONFIRM) && /onCancel\(\)/.test(CONFIRM), "Escape cancels");
  assert.ok(/cancelRef\.current\?\.focus\(\)/.test(CONFIRM), "Cancel (safe) auto-focused");
  assert.ok(/document\.body\.style\.overflow = "hidden"/.test(CONFIRM), "scroll locked");
  assert.ok(/onClick=\{onCancel\}[\s\S]*aria-hidden="true"/.test(CONFIRM), "backdrop cancels");
});
