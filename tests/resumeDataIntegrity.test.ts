// Phase A.1 — Resume Builder data-integrity guarantees.
// Logic tests + source-scans that lock in: empty production state, empty-save
// protection, single "empty" definition, and no-inferred language proficiency.
// No network, no DOM.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/resumeDataIntegrity.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { isResumeEmpty, draftToFormData, mergeResumeDraft } from "@/lib/resume/importResume";
import type { ResumeParseDraft } from "@/lib/resume/parseResumeDraft";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const emptyForm = (over: Partial<ResumeFormData> = {}): ResumeFormData => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", linkedin: "",
  photoUrl: "", summary: "", skills: [], experience: [], education: [], languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [], ...over,
});
const emptyDraft = (over: Partial<ResumeParseDraft> = {}): ResumeParseDraft => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", linkedin: "",
  photoUrl: "", summary: "", skills: [], experience: [], education: [], languages: [], projects: [], certifications: [],
  professionalLinks: [], customSections: [],
  unmappedText: "", ...over,
});

// ── A: empty production state (source-scan the seeded initial data) ───────────
test("INITIAL_FORM_DATA is genuinely empty (no sample facts)", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  const m = src.match(/const INITIAL_FORM_DATA: ResumeFormData = \{[\s\S]*?\n\};/);
  assert.ok(m, "INITIAL_FORM_DATA block found");
  const block = m![0];
  for (const empty of ["skills: []", "experience: []", "education: []", "languages: []",
                       'fullName: ""', 'summary: ""']) {
    assert.ok(block.includes(empty), `initial data has ${empty}`);
  }
  for (const sample of ["Vercel", "Linear", "Berkeley", "Mandarin", "Your Name", "yourwebsite"]) {
    assert.ok(!block.includes(sample), `initial data must NOT contain sample "${sample}"`);
  }
});

// ── B: single source of truth for "empty" + Apply vs Merge/Replace decision ──
test("isResumeEmpty drives the empty decision", () => {
  assert.equal(isResumeEmpty(emptyForm()), true);                       // → simple Apply path
  assert.equal(isResumeEmpty(emptyForm({ fullName: "A" })), false);     // → Merge/Replace path
  assert.equal(isResumeEmpty(emptyForm({ experience: [{ id: "e", company: "C", role: "R", startDate: "", endDate: "", description: "" }] })), false);
});

test("client uses isResumeEmpty (not sample-JSON compare) for hasExistingData", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(src.includes("!isResumeEmpty(formData)"), "hasExistingData uses isResumeEmpty");
  assert.ok(!src.includes("JSON.stringify(formData) !== JSON.stringify(INITIAL_FORM_DATA)"),
    "old fragile sample-JSON compare removed");
});

// ── C: empty-save protection ─────────────────────────────────────────────────
test("handleSave blocks an empty résumé before any Supabase write", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  const save = src.slice(src.indexOf("const handleSave"), src.indexOf("const handleSave") + 400);
  assert.ok(save.includes("isResumeEmpty(formData)"), "save guarded by isResumeEmpty");
  assert.ok(save.includes("before saving"), "clear user-facing message");
  // guard occurs before the insert/upsert
  assert.ok(save.indexOf("isResumeEmpty") < save.indexOf('setSaveStatus("saving")'),
    "guard runs before save begins");
});

// ── D: language proficiency — undetected stays "" (never inferred) ───────────
test("undetected proficiency stays empty; stated levels preserved", () => {
  const f = draftToFormData(emptyDraft({
    languages: [
      { id: "l1", language: "German", proficiency: "Native" },
      { id: "l2", language: "French", proficiency: "" },
    ],
  }));
  assert.equal(f.languages[0].proficiency, "Native"); // stated kept
  assert.equal(f.languages[1].proficiency, "");        // undetected NOT inferred
});

test("merge keeps existing stated level and does not invent one for new langs", () => {
  const out = mergeResumeDraft(
    emptyForm({ languages: [{ id: "g1", language: "English", proficiency: "Fluent" }] }),
    emptyDraft({ languages: [{ id: "g2", language: "Spanish", proficiency: "" }] }),
    "merge"
  );
  assert.equal(out.languages[0].proficiency, "Fluent");
  assert.equal(out.languages[1].proficiency, "");
});

test("no code path re-introduces a hardcoded import proficiency default", () => {
  const imp = read("../src/lib/resume/importResume.ts");
  assert.ok(!imp.includes("DEFAULT_IMPORT_PROFICIENCY"), "default-proficiency const removed");
  assert.ok(!imp.includes('"Conversational"'), "no hardcoded Conversational fallback");
});

test('type allows "" and form offers a Not specified option', () => {
  const types = read("../src/app/components/resume-builder/types.ts");
  assert.ok(types.includes('"Basic" | ""'), 'LanguageEntry.proficiency includes ""');
  const form = read("../src/app/components/resume-builder/ResumeForm.tsx");
  assert.ok(form.includes('<option value="">Not specified</option>'), "Not specified option present");
});

// ── E: preview renders no fabricated level for "" ────────────────────────────
test("preview shows proficiency only when present (no fabricated level)", () => {
  const prev = read("../src/app/components/resume-builder/ResumePreview.tsx");
  assert.ok(prev.includes("l.proficiency ?"), "proficiency rendered conditionally");
  // empty-résumé preview placeholder exists so the page doesn't look broken
  assert.ok(prev.includes("Your resume preview"), "empty-state preview text present");
});

// ── F: analysis empty-résumé guards (live ResumeAnalysisPanel — the obsolete
//        AIFeaturesPanel ATS UI was removed as dead code in Phase E) ───────────
test("Résumé Strength and Match to a Job are guarded against an empty résumé", () => {
  const panel = read("../src/app/components/resume-builder/ResumeAnalysisPanel.tsx");
  const strength = panel.slice(panel.indexOf("const analyze ="), panel.indexOf("const analyze =") + 300);
  assert.ok(strength.includes("isResumeEmpty(formData)"), "Strength analyze guarded against empty résumé");
  const run = panel.slice(panel.indexOf("const runMatch ="), panel.indexOf("const runMatch =") + 400);
  assert.ok(run.includes("isResumeEmpty(formData)"), "Job Match runMatch guarded against empty résumé");
});

// ── G: delete/reset returns to the (now empty) initial state ─────────────────
test("delete/reset returns to INITIAL_FORM_DATA (empty) and loadRecord still restores saved data", () => {
  const src = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(src.includes("setFormData(INITIAL_FORM_DATA)"), "reset uses empty INITIAL_FORM_DATA");
  assert.ok(src.includes("record.content?.formData") || src.includes("record.content.formData"),
    "loadRecord still restores a saved résumé");
  assert.ok(src.includes("withFormDataDefaults(record.content?.formData)"),
    "loadRecord normalizes the saved résumé via the canonical helper (consistent with View)");
});
