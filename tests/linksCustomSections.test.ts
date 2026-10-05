// Phase C Step 2 — Professional Links + Custom Sections.
// Behavioral tests via the pure engines (url safety, empty-state, import/merge,
// job-match, dirty-state); client components (form/preview/copy/review) locked by
// targeted source checks since they can't render headlessly.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/linksCustomSections.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  isResumeEmpty, hasMeaningfulLink, hasMeaningfulCustomSection, hasMeaningfulCustomItem,
  withFormDataDefaults, draftToFormData, mergeResumeDraft, EMPTY_RESUME_FORM_DATA,
} from "@/lib/resume/importResume";
import { safeHref, isSafeHttpUrl, displayUrl, labelFromUrl } from "@/lib/resume/urlSafety";
import { normalizeParsedResume, type ResumeParseDraft } from "@/lib/resume/parseResumeDraft";
import { matchResumeToJob, type JobRequirements } from "@/lib/resume/jobMatch";
import { serializeResumeState, isResumeDirty } from "@/lib/resume/dirtyState";
import type {
  ResumeFormData, ProfessionalLink, CustomSection, CustomSectionItem, CustomizationSettings, TemplateKey,
} from "@/app/components/resume-builder/types";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const S: CustomizationSettings = { colorTheme: "Purple Neon", font: "Minimal", layout: "One-column", spacing: "Balanced" };
const T: TemplateKey = "Creative";

const link = (o: Partial<ProfessionalLink> = {}): ProfessionalLink => ({ id: `l-${Math.random()}`, label: "", url: "", ...o });
const item = (o: Partial<CustomSectionItem> = {}): CustomSectionItem => ({ id: `i-${Math.random()}`, heading: "", subheading: "", date: "", description: "", url: "", ...o });
const section = (o: Partial<CustomSection> = {}): CustomSection => ({ id: `s-${Math.random()}`, title: "", items: [], ...o });
const form = (o: Partial<ResumeFormData> = {}): ResumeFormData => withFormDataDefaults(o);
const emptyDraft = (o: Partial<ResumeParseDraft> = {}): ResumeParseDraft => ({ ...withFormDataDefaults({}), languages: [], unmappedText: "", ...o });

// ── DATA / defaults ─────────────────────────────────────────────────────────
test("defaults are [] and a fresh résumé is empty", () => {
  const f = form();
  assert.deepEqual(f.professionalLinks, []);
  assert.deepEqual(f.customSections, []);
  assert.equal(isResumeEmpty(f), true);
  assert.deepEqual(EMPTY_RESUME_FORM_DATA.professionalLinks, []);
});

test("old saved résumé without the new fields hydrates safely", () => {
  const loaded = withFormDataDefaults({ fullName: "Nastya" } as Partial<ResumeFormData>);
  assert.deepEqual(loaded.professionalLinks, []);
  assert.deepEqual(loaded.customSections, []);
});

test("blank link / blank section do not count; genuine ones do", () => {
  assert.equal(hasMeaningfulLink(link()), false);
  assert.equal(hasMeaningfulLink(link({ url: "https://x.com" })), true);
  assert.equal(hasMeaningfulCustomItem(item()), false);
  assert.equal(hasMeaningfulCustomItem(item({ heading: "Award" })), true);
  assert.equal(hasMeaningfulCustomSection(section({ title: "Awards", items: [item()] })), false, "title + blank item → not meaningful");
  assert.equal(hasMeaningfulCustomSection(section({ title: "Awards", items: [item({ heading: "Best Paper" })] })), true);
  assert.equal(isResumeEmpty(form({ professionalLinks: [link({ url: "https://x.com" })] })), false);
  assert.equal(isResumeEmpty(form({ customSections: [section({ title: "Awards", items: [item({ heading: "Best Paper" })] })] })), false);
  assert.equal(isResumeEmpty(form({ customSections: [section({ title: "Awards", items: [item()] })] })), true, "title-only section stays empty");
});

// ── URL safety ──────────────────────────────────────────────────────────────
test("https and http allowed; bare domain normalized; identity/path preserved", () => {
  assert.equal(safeHref("https://linkedin.com/in/x"), "https://linkedin.com/in/x");
  assert.ok(safeHref("http://example.com")?.startsWith("http://"));
  assert.equal(safeHref("linkedin.com/in/example"), "https://linkedin.com/in/example");
  assert.equal(displayUrl("  linkedin.com/in/example  "), "linkedin.com/in/example", "display value not rewritten");
});

test("unsafe schemes are never clickable; malformed does not crash", () => {
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,<script>"), null);
  assert.equal(safeHref("file:///etc/passwd"), null);
  assert.equal(safeHref("//evil.com"), null);
  assert.equal(isSafeHttpUrl("not a url"), false);
  assert.doesNotThrow(() => safeHref("http://"));
  assert.equal(safeHref(""), null);
});

test("labelFromUrl only returns clear domain identities, else empty", () => {
  assert.equal(labelFromUrl("https://github.com/x"), "GitHub");
  assert.equal(labelFromUrl("linkedin.com/in/x"), "LinkedIn");
  assert.equal(labelFromUrl("https://some-random-portfolio.dev"), "", "no guess beyond clear domains");
  assert.equal(labelFromUrl("javascript:alert(1)"), "");
});

// ── Save/load round-trip ────────────────────────────────────────────────────
test("both fields round-trip through withFormDataDefaults (fresh arrays, no mutation)", () => {
  const saved: Partial<ResumeFormData> = {
    professionalLinks: [link({ label: "GitHub", url: "https://github.com/me" })],
    customSections: [section({ title: "Awards", items: [item({ heading: "Best Paper", date: "2023" })] })],
  };
  const out = withFormDataDefaults(saved);
  assert.equal(out.professionalLinks[0].url, "https://github.com/me");
  assert.equal(out.customSections[0].items[0].heading, "Best Paper");
  out.professionalLinks.push(link());
  assert.deepEqual(EMPTY_RESUME_FORM_DATA.professionalLinks, [], "default array not polluted");
});

// ── Import extraction ───────────────────────────────────────────────────────
test("import extracts genuine links (safe only) and derives a conservative label; never invents", () => {
  const draft = normalizeParsedResume({
    professionalLinks: [
      { label: "", url: "https://github.com/me" },   // label derived → GitHub
      { label: "Portfolio", url: "mysite.dev" },      // explicit label kept, bare domain ok
      { label: "", url: "javascript:alert(1)" },      // unsafe → dropped
      { url: "" },                                     // empty → dropped
    ],
  });
  assert.equal(draft.professionalLinks.length, 2);
  assert.equal(draft.professionalLinks[0].label, "GitHub");
  assert.equal(draft.professionalLinks[1].label, "Portfolio");
});

test("import extracts an explicit custom section; drops blank items/sections", () => {
  const draft = normalizeParsedResume({
    customSections: [
      { title: "Awards", items: [{ heading: "Best Paper", date: "2023" }, {}] },
      { title: "Empty", items: [{}] },   // no meaningful item → dropped
      { title: "", items: [{ heading: "x" }] }, // no title → dropped
    ],
  });
  assert.equal(draft.customSections.length, 1);
  assert.equal(draft.customSections[0].title, "Awards");
  assert.equal(draft.customSections[0].items.length, 1, "blank item dropped");
});

test("import is defensive against malformed input", () => {
  assert.doesNotThrow(() => normalizeParsedResume({ professionalLinks: "no", customSections: 5 }));
  const d = normalizeParsedResume({ professionalLinks: "no", customSections: 5 });
  assert.deepEqual(d.professionalLinks, []);
  assert.deepEqual(d.customSections, []);
});

// ── Merge / replace ─────────────────────────────────────────────────────────
test("Replace includes both; Merge dedupes exact link URLs (label-independent, existing wins)", () => {
  const replaced = draftToFormData(emptyDraft({
    professionalLinks: [link({ label: "GitHub", url: "https://github.com/me" })],
    customSections: [section({ title: "Awards", items: [item({ heading: "A" })] })],
  }));
  assert.equal(replaced.professionalLinks.length, 1);
  assert.equal(replaced.customSections.length, 1);

  const existing = form({ professionalLinks: [link({ label: "My GitHub", url: "https://github.com/me" })] });
  const merged = mergeResumeDraft(existing, emptyDraft({
    professionalLinks: [
      link({ label: "GitHub", url: "https://github.com/me" }), // same URL → skipped (existing wins)
      link({ label: "Portfolio", url: "https://me.dev" }),      // unique → appended
    ],
  }), "merge");
  assert.deepEqual(merged.professionalLinks.map((l) => l.url), ["https://github.com/me", "https://me.dev"]);
  assert.equal(merged.professionalLinks[0].label, "My GitHub", "existing label preserved on duplicate");
});

test("Merge folds items into a same-titled section and dedupes identical items conservatively", () => {
  const existing = form({ customSections: [section({ title: "Awards", items: [item({ heading: "Best Paper", date: "2023" })] })] });
  const merged = mergeResumeDraft(existing, emptyDraft({
    customSections: [section({ title: "Awards", items: [
      item({ heading: "Best Paper", date: "2023" }), // identical → skipped
      item({ heading: "Speaker Award", date: "2024" }), // unique → appended
    ] })],
  }), "merge");
  assert.equal(merged.customSections.length, 1, "same title → one section");
  assert.deepEqual(merged.customSections[0].items.map((i) => i.heading), ["Best Paper", "Speaker Award"]);
});

test("Cancel/no-op merge never mutates the existing résumé", () => {
  const existing = form({ professionalLinks: [link({ url: "https://a.com" })] });
  const before = JSON.stringify(existing);
  mergeResumeDraft(existing, emptyDraft({ professionalLinks: [link({ url: "https://b.com" })] }), "merge");
  assert.equal(JSON.stringify(existing), before);
});

// ── Job Match ───────────────────────────────────────────────────────────────
test("a professional link URL alone does NOT imply a skill", () => {
  const resume = form({ professionalLinks: [link({ label: "GitHub", url: "https://github.com/me" })] });
  const req: JobRequirements = { requiredSkills: ["GitHub", "Git"], preferredSkills: [], importantKeywords: [], roleTitle: "" };
  const r = matchResumeToJob(resume, req);
  assert.deepEqual(r.missingRequired.sort(), ["Git", "GitHub"], "URL is not evidence of a skill");
});

test("an explicit term inside a custom-section item counts as evidence; the title alone does not", () => {
  const resume = form({ customSections: [section({ title: "Kubernetes Awards", items: [item({ heading: "Speaker", description: "Talk on Terraform pipelines" })] })] });
  const r1 = matchResumeToJob(resume, { requiredSkills: ["Terraform"], preferredSkills: [], importantKeywords: [], roleTitle: "" });
  assert.equal(r1.categories[0].matches[0].matched, true, "explicit term in item description is evidence");
  assert.equal(r1.categories[0].matches[0].evidence, "Custom sections");
  const r2 = matchResumeToJob(resume, { requiredSkills: ["Kubernetes"], preferredSkills: [], importantKeywords: [], roleTitle: "" });
  assert.equal(r2.categories[0].matches[0].matched, false, "section title alone is NOT evidence");
});

// ── Dirty state ─────────────────────────────────────────────────────────────
test("adding/editing links or custom content marks dirty; exact revert is clean", () => {
  const base = serializeResumeState(form(), S, T);
  assert.equal(isResumeDirty(base, form({ professionalLinks: [link({ url: "https://x.com" })] }), S, T), true, "link add");
  assert.equal(isResumeDirty(base, form({ customSections: [section({ title: "Awards", items: [item({ heading: "A" })] })] }), S, T), true, "custom add");
  assert.equal(isResumeDirty(base, form(), S, T), false, "exact revert clean");
});

// ── Client wiring (source contracts) ────────────────────────────────────────
test("form: links + custom sections present; dictation on label/heading/subheading/desc, not URL/date", () => {
  const f = read("../src/app/components/resume-builder/ResumeForm.tsx");
  assert.ok(/Professional Links/.test(f) && /Custom Sections/.test(f), "both sections in the form");
  assert.ok(/id=\{`link-\$\{link\.id\}-label`\}/.test(f), "link label dictatable");
  assert.ok(/id=\{`cs-\$\{sec\.id\}-\$\{item\.id\}-heading`\}/.test(f), "item heading dictatable");
  assert.ok(/dictateCustomItemDesc\(sec\.id, item\.id\)/.test(f), "item description dictatable");
  assert.ok(!/id=\{`link-\$\{link\.id\}-url`\}/.test(f), "link URL NOT dictatable");
  assert.ok((f.match(/useDictation\(\)/g) || []).length === 1, "one shared dictation session");
});

test("preview: blocks defined, safe hrefs only, wired into all four layouts", () => {
  const pv = read("../src/app/components/resume-builder/ResumePreview.tsx");
  assert.ok(/function ProfessionalLinksBlock/.test(pv) && /function CustomSectionsBlock/.test(pv), "blocks defined");
  assert.ok(/const href = safeHref\(l\.url\)/.test(pv), "links use safeHref");
  assert.ok(/href \?/.test(pv) && /<a href=\{href\}/.test(pv), "clickable only when safe");
  assert.equal((pv.match(/<ProfessionalLinksBlock /g) || []).length, 4, "links in all 4 layouts");
  assert.equal((pv.match(/<CustomSectionsBlock /g) || []).length, 4, "custom sections in all 4 layouts");
});

test("Copy Text includes both, blank omitted; import review shows both", () => {
  const ex = read("../src/app/components/resume-builder/ExportSection.tsx");
  assert.ok(/"PROFESSIONAL LINKS"/.test(ex), "links in Copy Text");
  assert.ok(/customSections \?\? \[\]/.test(ex) || /f\.customSections/.test(ex), "custom sections in Copy Text");
  const rv = read("../src/app/components/resume-builder/ResumeImportPanel.tsx");
  assert.ok(/Professional links \(\{draft\.professionalLinks\.length\}\)/.test(rv), "review shows links");
  assert.ok(/Custom sections \(\{draft\.customSections\.length\}\)/.test(rv), "review shows custom sections");
});
