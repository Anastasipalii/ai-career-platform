// Phase C Step 1 — Projects + Certifications.
// Behavioral tests via the pure engines (import/merge/empty/job-match); client
// components (form, preview, copy) are locked by targeted source checks because
// they can't render headlessly.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/projectsCertifications.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  isResumeEmpty, hasMeaningfulProject, hasMeaningfulCertification,
  draftToFormData, mergeResumeDraft,
} from "@/lib/resume/importResume";
import { normalizeParsedResume, type ResumeParseDraft } from "@/lib/resume/parseResumeDraft";
import { matchResumeToJob, type JobRequirements } from "@/lib/resume/jobMatch";
import type { ResumeFormData, ProjectEntry, CertificationEntry } from "@/app/components/resume-builder/types";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const emptyForm = (over: Partial<ResumeFormData> = {}): ResumeFormData => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "",
  linkedin: "", photoUrl: "", summary: "", skills: [], experience: [], education: [],
  languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [], ...over,
});
const emptyDraft = (over: Partial<ResumeParseDraft> = {}): ResumeParseDraft => ({
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "",
  linkedin: "", photoUrl: "", summary: "", skills: [], experience: [], education: [],
  languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [], unmappedText: "", ...over,
});
const proj = (o: Partial<ProjectEntry> = {}): ProjectEntry => ({
  id: `p-${Math.random()}`, name: "", role: "", startDate: "", endDate: "", current: false, description: "", url: "", ...o,
});
const cert = (o: Partial<CertificationEntry> = {}): CertificationEntry => ({
  id: `c-${Math.random()}`, name: "", issuer: "", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "", ...o,
});

// ── DATA ──────────────────────────────────────────────────────────────────────
test("new résumé starts with empty projects and certifications", () => {
  const f = emptyForm();
  assert.deepEqual(f.projects, []);
  assert.deepEqual(f.certifications, []);
  assert.equal(isResumeEmpty(f), true);
});

test("meaningful-entry helpers: blank rows are not meaningful; real ones are", () => {
  assert.equal(hasMeaningfulProject(proj()), false);
  assert.equal(hasMeaningfulProject(proj({ name: "Booking app" })), true);
  assert.equal(hasMeaningfulProject(proj({ description: "Built X" })), true);
  assert.equal(hasMeaningfulCertification(cert()), false);
  assert.equal(hasMeaningfulCertification(cert({ name: "AWS SAA" })), true);
  assert.equal(hasMeaningfulCertification(cert({ issuer: "Amazon" })), true);
});

test("a real project or certification makes the résumé non-empty; a blank row does not", () => {
  assert.equal(isResumeEmpty(emptyForm({ projects: [proj({ name: "Booking app" })] })), false);
  assert.equal(isResumeEmpty(emptyForm({ certifications: [cert({ name: "AWS SAA" })] })), false);
  assert.equal(isResumeEmpty(emptyForm({ projects: [proj()] })), true, "blank project row → still empty");
  assert.equal(isResumeEmpty(emptyForm({ certifications: [cert()] })), true, "blank cert row → still empty");
});

// ── SAVE / LOAD backward compatibility ─────────────────────────────────────────
test("old saved résumé without the new fields loads as [] via default-spread", () => {
  // Mirrors loadRecord's backward-compat normalization via withFormDataDefaults.
  const DEFAULTS = emptyForm();
  const oldSaved: Partial<ResumeFormData> = { fullName: "Nastya", skills: ["React"] }; // no projects/certifications keys
  const loaded = { ...DEFAULTS, ...oldSaved } as ResumeFormData;
  assert.deepEqual(loaded.projects, []);
  assert.deepEqual(loaded.certifications, []);
  assert.equal(loaded.fullName, "Nastya");
});

test("loadRecord defaults missing arrays (source contract) and Save serializes whole formData", () => {
  const client = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(/withFormDataDefaults\(record\.content\??\.formData\)/.test(client), "load normalizes missing arrays via withFormDataDefaults");
  assert.ok(/content: \{ formData, settings \}/.test(client), "save stores full formData (no schema change)");
  assert.ok(/projects: \[\]/.test(client) && /certifications: \[\]/.test(client), "INITIAL_FORM_DATA seeds empty arrays");
});

// ── IMPORT extraction ──────────────────────────────────────────────────────────
test("extraction pulls a genuine project and certification; missing sub-fields stay empty; no invention", () => {
  const draft = normalizeParsedResume({
    projects: [{ name: "Boho Padel Booking", description: "Built booking + payments", url: "https://boho.example" }],
    certifications: [{ name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services" }],
  });
  assert.equal(draft.projects.length, 1);
  assert.equal(draft.projects[0].name, "Boho Padel Booking");
  assert.equal(draft.projects[0].role, "", "role not invented");
  assert.equal(draft.projects[0].startDate, "", "dates not invented");
  assert.equal(draft.certifications.length, 1);
  assert.equal(draft.certifications[0].issuer, "Amazon Web Services");
  assert.equal(draft.certifications[0].expirationDate, "", "expiration not invented");
  assert.equal(draft.certifications[0].credentialId, "", "credential id not invented");
});

test("extraction drops blank project/certification objects (no phantom rows)", () => {
  const draft = normalizeParsedResume({
    projects: [{}, { url: "" }],
    certifications: [{}, { issueDate: "2020" }], // issueDate alone, no name/issuer → dropped
  });
  assert.equal(draft.projects.length, 0);
  assert.equal(draft.certifications.length, 0);
});

test("extraction is defensive against malformed input (never throws)", () => {
  assert.doesNotThrow(() => normalizeParsedResume({ projects: "nope", certifications: 5 }));
  const d = normalizeParsedResume({ projects: "nope", certifications: 5 });
  assert.deepEqual(d.projects, []);
  assert.deepEqual(d.certifications, []);
});

// ── IMPORT merge / replace ─────────────────────────────────────────────────────
test("Replace includes projects and certifications", () => {
  const out = draftToFormData(emptyDraft({
    projects: [proj({ name: "P1" })],
    certifications: [cert({ name: "C1", issuer: "Org" })],
  }));
  assert.equal(out.projects.length, 1);
  assert.equal(out.certifications.length, 1);
});

test("Merge appends unique projects/certs and dedupes true duplicates (existing wins)", () => {
  const existing = emptyForm({
    projects: [proj({ name: "Booking app", url: "https://a.com" })],
    certifications: [cert({ name: "AWS SAA", issuer: "Amazon" })],
  });
  const draft = emptyDraft({
    projects: [
      proj({ name: "Booking app", url: "https://a.com" }), // true duplicate (name+url) → skipped
      proj({ name: "New portfolio" }),                     // unique → appended
    ],
    certifications: [
      cert({ name: "AWS SAA", issuer: "Amazon" }),         // true duplicate → skipped
      cert({ name: "CKA", issuer: "CNCF" }),               // unique → appended
    ],
  });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.deepEqual(out.projects.map((p) => p.name), ["Booking app", "New portfolio"]);
  assert.deepEqual(out.certifications.map((c) => c.name), ["AWS SAA", "CKA"]);
});

test("Merge keeps two DISTINCT projects with similar names (conservative)", () => {
  const existing = emptyForm({ projects: [proj({ name: "Dashboard", startDate: "2021", endDate: "2022" })] });
  const draft = emptyDraft({ projects: [proj({ name: "Dashboard", startDate: "2023", endDate: "2024" })] });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.projects.length, 2, "same name, different date range → distinct");
});

test("Merge dedupes certifications by credential ID when present", () => {
  const existing = emptyForm({ certifications: [cert({ name: "Cloud Cert", issuer: "X", credentialId: "ID-1" })] });
  const draft = emptyDraft({ certifications: [cert({ name: "Cloud Certification", issuer: "Y", credentialId: "ID-1" })] });
  const out = mergeResumeDraft(existing, draft, "merge");
  assert.equal(out.certifications.length, 1, "same credential id → duplicate");
});

test("Cancel/no-op: mergeResumeDraft never mutates the existing résumé object", () => {
  const existing = emptyForm({ projects: [proj({ name: "P1" })] });
  const before = JSON.stringify(existing);
  mergeResumeDraft(existing, emptyDraft({ projects: [proj({ name: "P2" })] }), "merge");
  assert.equal(JSON.stringify(existing), before);
});

// ── JOB MATCH evidence ─────────────────────────────────────────────────────────
test("a required skill genuinely in a Project counts as evidence (from Projects)", () => {
  const resume = emptyForm({
    jobTitle: "Engineer",
    projects: [proj({ name: "Infra revamp", description: "Migrated services to Kubernetes and Terraform" })],
  });
  const req: JobRequirements = { requiredSkills: ["Kubernetes"], preferredSkills: [], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  const m = r.categories.find((c) => c.key === "required")!.matches[0];
  assert.equal(m.matched, true);
  assert.equal(m.evidence, "Projects");
});

test("an explicit certification counts as evidence (from Certifications)", () => {
  const resume = emptyForm({ certifications: [cert({ name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services" })] });
  const req: JobRequirements = { requiredSkills: [], preferredSkills: ["AWS"], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  const m = r.categories.find((c) => c.key === "preferred")!.matches[0];
  assert.equal(m.matched, true);
  assert.equal(m.evidence, "Certifications");
});

test("no inferred equivalence: an unrelated required skill not present anywhere stays missing", () => {
  const resume = emptyForm({ projects: [proj({ name: "React Dashboard", description: "Built a dashboard in React" })] });
  const req: JobRequirements = { requiredSkills: ["TypeScript"], preferredSkills: [], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  assert.equal(r.categories.find((c) => c.key === "required")!.matches[0].matched, false);
});

// ── TEXT representation (Copy Text) ────────────────────────────────────────────
test("Copy Text builder includes Projects & Certifications and filters blank rows", () => {
  const src = read("../src/app/components/resume-builder/ExportSection.tsx");
  assert.ok(/"PROJECTS"/.test(src) && /"CERTIFICATIONS"/.test(src), "sections added to plain text");
  assert.ok(/projects ?\?? ?\.\.\.|f\.projects ?\?\?/.test(src) || /f\.projects/.test(src), "reads projects");
  assert.ok(/filter\(\(p\) => p\.name\.trim\(\) \|\| p\.description\.trim\(\)\)/.test(src), "blank projects omitted");
  assert.ok(/filter\(\(c\) => c\.name\.trim\(\) \|\| c\.issuer\.trim\(\)\)/.test(src), "blank certs omitted");
});

// ── DICTATION coverage ─────────────────────────────────────────────────────────
test("dictation enabled on project name/role/description and cert name/issuer only", () => {
  const form = read("../src/app/components/resume-builder/ResumeForm.tsx");
  // Enabled (DictatableInput / mic):
  assert.ok(/id=\{`proj-\$\{proj\.id\}-name`\}/.test(form), "project name dictatable");
  assert.ok(/id=\{`proj-\$\{proj\.id\}-role`\}/.test(form), "project role dictatable");
  assert.ok(/dictateProjDesc\(proj\.id\)/.test(form), "project description dictatable");
  assert.ok(/id=\{`cert-\$\{cert\.id\}-name`\}/.test(form), "cert name dictatable");
  assert.ok(/id=\{`cert-\$\{cert\.id\}-issuer`\}/.test(form), "cert issuer dictatable");
  // Excluded: URL / dates / credential id must be plain inputs (no DictatableInput id for them).
  assert.ok(!/id=\{`proj-\$\{proj\.id\}-url`\}/.test(form), "project URL not dictatable");
  assert.ok(!/id=\{`cert-\$\{cert\.id\}-credentialId`\}/.test(form), "credential id not dictatable");
  assert.ok(!/id=\{`cert-\$\{cert\.id\}-issueDate`\}/.test(form), "dates not dictatable");
  // Single shared controller (one useDictation call).
  assert.equal((form.match(/useDictation\(\)/g) || []).length, 1, "one shared dictation session");
});

// ── PREVIEW ────────────────────────────────────────────────────────────────────
test("preview blocks hide when empty and are wired into all four layouts", () => {
  const src = read("../src/app/components/resume-builder/ResumePreview.tsx");
  assert.ok(/function ProjectsBlock/.test(src) && /function CertificationsBlock/.test(src), "blocks defined");
  // Hidden when empty (filtering now routed through the shared model selector):
  assert.ok(/const items = meaningfulProjects\(formData\);\s*\n\s*if \(items\.length === 0\) return null;/.test(src), "ProjectsBlock returns null when empty");
  assert.ok(/const items = meaningfulCertifications\(formData\);\s*\n\s*if \(items\.length === 0\) return null;/.test(src), "CertificationsBlock returns null when empty");
  // Referenced once per layout (4 layouts):
  assert.equal((src.match(/<ProjectsBlock /g) || []).length, 4, "ProjectsBlock in all 4 layouts");
  assert.equal((src.match(/<CertificationsBlock /g) || []).length, 4, "CertificationsBlock in all 4 layouts");
});

// ── IMPORT review UI ───────────────────────────────────────────────────────────
test("import review shows Projects & Certifications with counts and 'Not found'", () => {
  const src = read("../src/app/components/resume-builder/ResumeImportPanel.tsx");
  assert.ok(/Projects \(\{draft\.projects\.length\}\)/.test(src), "projects reviewed with count");
  assert.ok(/Certifications \(\{draft\.certifications\.length\}\)/.test(src), "certifications reviewed with count");
});
