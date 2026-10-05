// Tests for the pure résumé import merge/replace logic (Step 3).
// No network, no DOM, no OpenAI.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/importResume.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  draftToFormData,
  mergeResumeDraft,
  isResumeEmpty,
} from "@/lib/resume/importResume";
import type { ResumeParseDraft } from "@/lib/resume/parseResumeDraft";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

const emptyDraft = (over: Partial<ResumeParseDraft> = {}): ResumeParseDraft => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", linkedin: "",
  photoUrl: "", summary: "", skills: [], experience: [], education: [], languages: [], projects: [], certifications: [],
  professionalLinks: [], customSections: [],
  unmappedText: "", ...over,
});

const emptyForm = (over: Partial<ResumeFormData> = {}): ResumeFormData => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", linkedin: "",
  photoUrl: "", summary: "", skills: [], experience: [], education: [], languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [], ...over,
});

// ── draftToFormData ──────────────────────────────────────────────────────────
test("draftToFormData copies fields and resolves undetected proficiency", () => {
  const d = emptyDraft({
    fullName: "Jane", skills: ["React"],
    languages: [
      { id: "l1", language: "German", proficiency: "Native" },
      { id: "l2", language: "French", proficiency: "" },
    ],
  });
  const f = draftToFormData(d);
  assert.equal(f.fullName, "Jane");
  assert.deepEqual(f.skills, ["React"]);
  assert.equal(f.languages[0].proficiency, "Native");
  assert.equal(f.languages[1].proficiency, ""); // undetected → not specified (never inferred)
  assert.equal(f.photoUrl, "");
  assert.equal((f as unknown as Record<string, unknown>).unmappedText, undefined); // not a form field
});

// ── isResumeEmpty ────────────────────────────────────────────────────────────
test("isResumeEmpty true only when fully empty", () => {
  assert.equal(isResumeEmpty(emptyForm()), true);
  assert.equal(isResumeEmpty(emptyForm({ fullName: "X" })), false);
  assert.equal(isResumeEmpty(emptyForm({ skills: ["A"] })), false);
});

// ── replace discards existing ────────────────────────────────────────────────
test("replace mode fully replaces the existing résumé", () => {
  const existing = emptyForm({ fullName: "Old Name", summary: "Old summary", skills: ["Old"] });
  const draft = emptyDraft({ fullName: "New Name", skills: ["New"] });
  const out = mergeResumeDraft(existing, draft, "replace");
  assert.equal(out.fullName, "New Name");
  assert.equal(out.summary, ""); // draft had none → replaced
  assert.deepEqual(out.skills, ["New"]);
});

// ── merge: existing non-empty scalars win, blanks filled ─────────────────────
test("merge keeps existing scalar values and fills only blanks", () => {
  const existing = emptyForm({ fullName: "Keep Me", email: "" });
  const draft = emptyDraft({ fullName: "Ignored", email: "new@example.com", phone: "123" });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.fullName, "Keep Me"); // existing wins
  assert.equal(out.email, "new@example.com"); // blank filled
  assert.equal(out.phone, "123"); // blank filled
});

// ── merge: skills dedupe (case-insensitive) ──────────────────────────────────
test("merge de-duplicates skills case-insensitively, existing order first", () => {
  const existing = emptyForm({ skills: ["React", "TypeScript"] });
  const draft = emptyDraft({ skills: ["react", "GraphQL", "typescript", "Node"] });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.deepEqual(out.skills, ["React", "TypeScript", "GraphQL", "Node"]);
});

// ── merge: experience dedupe by company+role+dates ───────────────────────────
test("merge appends non-duplicate experience", () => {
  const existing = emptyForm({
    experience: [{ id: "e1", company: "Acme", role: "Dev", startDate: "2020", endDate: "2022", description: "x" }],
  });
  const draft = emptyDraft({
    experience: [
      { id: "e2", company: "acme", role: "dev", startDate: "2020", endDate: "2022", description: "dup" }, // dup
      { id: "e3", company: "Globex", role: "Lead", startDate: "2022", endDate: "2024", description: "new" },
    ],
  });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.experience.length, 2);
  assert.equal(out.experience[1].company, "Globex");
  assert.equal(out.experience[0].description, "x"); // original kept
});

// ── merge: education dedupe ──────────────────────────────────────────────────
test("merge appends non-duplicate education", () => {
  const existing = emptyForm({
    education: [{ id: "d1", institution: "Uni", degree: "BSc", field: "CS", startDate: "2016", endDate: "2020" }],
  });
  const draft = emptyDraft({
    education: [
      { id: "d2", institution: "uni", degree: "bsc", field: "cs", startDate: "2016", endDate: "2020" }, // dup
      { id: "d3", institution: "Grad School", degree: "MSc", field: "AI", startDate: "2020", endDate: "2022" },
    ],
  });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.education.length, 2);
  assert.equal(out.education[1].institution, "Grad School");
});

// ── merge: languages dedupe by name, existing wins ───────────────────────────
test("merge de-duplicates languages by name; existing proficiency wins", () => {
  const existing = emptyForm({ languages: [{ id: "g1", language: "English", proficiency: "Native" }] });
  const draft = emptyDraft({
    languages: [
      { id: "g2", language: "english", proficiency: "Fluent" }, // dup name → skipped
      { id: "g3", language: "Spanish", proficiency: "" }, // new, undetected level
    ],
  });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.languages.length, 2);
  assert.equal(out.languages[0].proficiency, "Native"); // existing kept
  assert.equal(out.languages[1].language, "Spanish");
  assert.equal(out.languages[1].proficiency, ""); // undetected stays not specified
});

// ── merge never loses existing photoUrl ──────────────────────────────────────
test("merge preserves existing photoUrl (never from text)", () => {
  const existing = emptyForm({ photoUrl: "blob:xyz" });
  const out = mergeResumeDraft(existing, emptyDraft({ fullName: "New" }), "merge");
  assert.equal(out.photoUrl, "blob:xyz");
});
