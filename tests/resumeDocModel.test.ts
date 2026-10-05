// Tests for the PURE shared résumé document model (Phase D Step 2A groundwork).
// No network, no DOM, no @react-pdf. Also includes a source-scan regression
// guard confirming ResumePreview now consumes the model selectors, the four
// template layouts are intact, and the window.print exporter is untouched.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/resumeDocModel.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildResumeDocModel,
  meaningfulProjects,
  meaningfulCertifications,
  meaningfulLinks,
  visibleCustomSections,
  joinDateRange,
  descriptionLines,
} from "@/lib/resume/resumeDocModel";
import { EMPTY_RESUME_FORM_DATA } from "@/lib/resume/importResume";
import type { ResumeFormData, CustomizationSettings } from "@/app/components/resume-builder/types";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const settings = (over: Partial<CustomizationSettings> = {}): CustomizationSettings => ({
  colorTheme: "Navy Blue", font: "Minimal", layout: "One-column", spacing: "Balanced", ...over,
});

const form = (over: Partial<ResumeFormData> = {}): ResumeFormData => ({
  ...EMPTY_RESUME_FORM_DATA,
  skills: [], experience: [], education: [], languages: [],
  projects: [], certifications: [], professionalLinks: [], customSections: [],
  ...over,
});

const fullForm = (): ResumeFormData => form({
  fullName: "Jane Doe", jobTitle: "Engineer", email: "j@x.com", phone: "555", location: "Berlin", linkedin: "linkedin.com/in/jane", website: "jane.dev",
  summary: "Line one\n\nLine two", skills: ["React", "TS"],
  experience: [{ id: "e1", company: "Acme", role: "Dev", startDate: "2020", endDate: "2022", description: "Built things\nShipped more" }],
  education: [{ id: "ed1", institution: "MIT", degree: "BSc", field: "CS", startDate: "2016", endDate: "2020" }],
  languages: [{ id: "l1", language: "English", proficiency: "Native" }],
  projects: [
    { id: "p1", name: "Thing", role: "Lead", startDate: "2021", endDate: "", current: true, description: "Did a thing", url: "github.com/x/thing" },
    { id: "p2", name: "", role: "", startDate: "", endDate: "", current: false, description: "", url: "" }, // blank → dropped
  ],
  certifications: [
    { id: "c1", name: "AWS SA", issuer: "Amazon", issueDate: "2022", expirationDate: "2025", credentialId: "ABC", credentialUrl: "aws.amazon.com/x" },
    { id: "c2", name: "", issuer: "", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "" }, // blank → dropped
  ],
  professionalLinks: [
    { id: "k1", label: "GitHub", url: "github.com/jane" },
    { id: "k2", label: "Bad", url: "javascript:alert(1)" }, // unsafe scheme
    { id: "k3", label: "NoUrl", url: "" },                   // no url → dropped
  ],
  customSections: [
    { id: "s1", title: "Awards", items: [
      { id: "i1", heading: "Best", subheading: "2021", date: "2021", description: "Won\nAgain", url: "example.com/award" },
      { id: "i2", heading: "", subheading: "", date: "", description: "", url: "" }, // blank item → dropped
    ]},
    { id: "s2", title: "Empty", items: [ { id: "i3", heading: "", subheading: "", date: "", description: "", url: "" } ] }, // no meaningful items → section dropped
  ],
});

// ── helpers ──────────────────────────────────────────────────────────────────
test("joinDateRange mirrors the preview's filter(Boolean).join", () => {
  assert.equal(joinDateRange("2020", "2022"), "2020 – 2022");
  assert.equal(joinDateRange("2020", ""), "2020");
  assert.equal(joinDateRange("", "2022"), "2022");
  assert.equal(joinDateRange("", ""), "");
});

test("descriptionLines drops empty lines", () => {
  assert.deepEqual(descriptionLines("a\n\nb\n"), ["a", "b"]);
  assert.deepEqual(descriptionLines(""), []);
});

// ── empty model ──────────────────────────────────────────────────────────────
test("empty résumé produces an empty, placeholder-named model", () => {
  const m = buildResumeDocModel(EMPTY_RESUME_FORM_DATA, settings());
  assert.equal(m.isEmpty, true);
  assert.equal(m.fullName, "Your Name");
  assert.equal(m.jobTitle, "Your Title");
  assert.deepEqual(m.contact.items, []);
  assert.equal(m.summary, "");
  assert.deepEqual(m.skills, []);
  assert.deepEqual(m.projects, []);
  assert.deepEqual(m.certifications, []);
  assert.deepEqual(m.links, []);
  assert.deepEqual(m.customSections, []);
  assert.deepEqual(m.visibleSections, []);
});

// ── full model: every section present & formatted ─────────────────────────────
test("full résumé: all sections present, ordered, and formatted", () => {
  const m = buildResumeDocModel(fullForm(), settings());
  assert.equal(m.isEmpty, false);
  assert.equal(m.fullName, "Jane Doe");
  assert.deepEqual(m.contact.items, ["j@x.com", "555", "Berlin", "linkedin.com/in/jane"]);
  assert.equal(m.summary, "Line one\n\nLine two");

  // experience formatting
  assert.equal(m.experience[0].dateRange, "2020 – 2022");
  assert.deepEqual(m.experience[0].lines, ["Built things", "Shipped more"]);

  // projects: blank dropped, current → Present, url shown
  assert.equal(m.projects.length, 1);
  assert.equal(m.projects[0].name, "Thing");
  assert.equal(m.projects[0].dateRange, "2021 – Present");
  assert.equal(m.projects[0].url, "github.com/x/thing");

  // certifications: blank dropped, meta assembled
  assert.equal(m.certifications.length, 1);
  assert.equal(m.certifications[0].meta, "Amazon · ID ABC");
  assert.equal(m.certifications[0].dateRange, "2022 – 2025");

  // canonical visible-section order
  assert.deepEqual(m.visibleSections, [
    "summary", "experience", "education", "projects", "certifications", "links", "customSections", "skills", "languages",
  ]);
});

// ── link safety routes through safeHref/displayUrl (no second impl) ───────────
test("links: safe bare domain linked, unsafe scheme not linked, no-url dropped", () => {
  const m = buildResumeDocModel(fullForm(), settings());
  assert.equal(m.links.length, 2); // k3 (no url) dropped
  const gh = m.links.find((l) => l.label === "GitHub")!;
  assert.equal(gh.href, "https://github.com/jane");
  assert.equal(gh.shown, "github.com/jane");
  const bad = m.links.find((l) => l.label === "Bad")!;
  assert.equal(bad.href, null);                 // javascript: never linked
  assert.equal(bad.shown, "javascript:alert(1)"); // display text preserved verbatim
});

test("custom sections: meaningful items kept, empty section dropped, urls resolved", () => {
  const m = buildResumeDocModel(fullForm(), settings());
  assert.equal(m.customSections.length, 1);     // "Empty" section dropped
  const awards = m.customSections[0];
  assert.equal(awards.title, "Awards");
  assert.equal(awards.items.length, 1);         // blank item dropped
  assert.equal(awards.items[0].href, "https://example.com/award");
  assert.deepEqual(awards.items[0].lines, ["Won", "Again"]);
});

// ── backward compatibility: a résumé saved before newer sections existed ──────
test("backward compat: partial/old résumé missing new arrays does not throw", () => {
  const old = { fullName: "Old", jobTitle: "Role", email: "", phone: "", location: "", website: "", linkedin: "", photoUrl: "", summary: "Hi", skills: ["X"], experience: [], education: [] } as unknown as Partial<ResumeFormData>;
  const m = buildResumeDocModel(old, settings());
  assert.equal(m.fullName, "Old");
  assert.deepEqual(m.projects, []);
  assert.deepEqual(m.certifications, []);
  assert.deepEqual(m.links, []);
  assert.deepEqual(m.customSections, []);
  assert.deepEqual(m.visibleSections, ["summary", "skills"]);
});

test("backward compat: null/undefined formData yields the empty model", () => {
  const m1 = buildResumeDocModel(null, settings());
  const m2 = buildResumeDocModel(undefined, settings());
  assert.equal(m1.isEmpty, true);
  assert.equal(m2.isEmpty, true);
});

// ── purity: inputs are never mutated ───────────────────────────────────────────
test("buildResumeDocModel does not mutate its input", () => {
  const f = fullForm();
  const snapshot = JSON.stringify(f);
  buildResumeDocModel(f, settings());
  assert.equal(JSON.stringify(f), snapshot);
});

// ── selectors mirror the old inline preview filters exactly ───────────────────
test("selectors drop blank rows the way the preview did", () => {
  const f = fullForm();
  assert.equal(meaningfulProjects(f).length, 1);
  assert.equal(meaningfulCertifications(f).length, 1);
  assert.equal(meaningfulLinks(f).length, 2);
  assert.equal(visibleCustomSections(f).length, 1);
  assert.equal(visibleCustomSections(f)[0].items.length, 1);
});

test("model honors the layout from settings", () => {
  assert.equal(buildResumeDocModel(fullForm(), settings({ layout: "Sidebar" })).layout, "Sidebar");
});

// ── REGRESSION (source-scan): refactor kept behavior & left the exporter alone ─
test("ResumePreview consumes the model selectors (no inline meaningful filters)", () => {
  const src = read("../src/app/components/resume-builder/ResumePreview.tsx");
  assert.ok(src.includes('from "@/lib/resume/resumeDocModel"'), "imports the model");
  assert.ok(src.includes("meaningfulProjects(formData)"), "projects via selector");
  assert.ok(src.includes("meaningfulCertifications(formData)"), "certs via selector");
  assert.ok(src.includes("meaningfulLinks(formData)"), "links via selector");
  assert.ok(src.includes("visibleCustomSections(formData)"), "custom sections via selector");
  // The old inline filters must be gone.
  assert.ok(!/\.filter\(\(p\) => p\.name\.trim\(\) \|\| p\.description\.trim\(\)\)/.test(src), "no inline projects filter");
  assert.ok(!/\.filter\(\(l\) => l\.url\.trim\(\)\)/.test(src), "no inline links filter");
});

test("all four template layouts remain present and wired", () => {
  const src = read("../src/app/components/resume-builder/ResumePreview.tsx");
  for (const fn of ["function OneColumn", "function TwoColumn", "function SidebarLayout", "function ModernCard"]) {
    assert.ok(src.includes(fn), `${fn} still defined`);
  }
  assert.ok(src.includes('settings.layout === "One-column"'), "one-column wired");
  assert.ok(src.includes('settings.layout === "Two-column"'), "two-column wired");
  assert.ok(src.includes('settings.layout === "Sidebar"'), "sidebar wired");
  assert.ok(src.includes('settings.layout === "Modern card"'), "modern card wired");
});

test("the window.print exporter in ResumeBuilderClient is untouched & active", () => {
  const client = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
  assert.ok(/window\.open\(\s*""\s*,\s*"_blank"/.test(client), "window.open popup present");
  assert.ok(client.includes('showToast("PDF export opened."'), "honest 'opened' toast present");
  assert.ok(client.includes("printWin.onafterprint"), "afterprint lifecycle present");
  assert.ok(/printWin\.print\(\)/.test(client), "print() still invoked");
});

test("the dependency-free modules never import a PDF engine or React", () => {
  for (const rel of ["../src/lib/resume/resumeDocModel.ts", "../src/lib/resume/pdfFilename.ts", "../src/lib/resume/pdfBlob.ts"]) {
    const src = read(rel);
    assert.ok(!/(from\s+|import\s*\(\s*|require\s*\(\s*)["\x27]@react-pdf\/renderer["\x27]/.test(src), `${rel} must not import @react-pdf/renderer`);
    assert.ok(!/from ["']react["']/.test(src), `${rel} must not import react`);
  }
});
