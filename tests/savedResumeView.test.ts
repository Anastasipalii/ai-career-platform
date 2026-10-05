// Phase C Step 1.1 — Saved résumé read-only View.
// Behavioral tests for the pure snapshot helper; source contracts for the client
// components (modal + card), which can't render headlessly. The contracts assert
// the read-only guarantees: viewing never mutates builder state, the record, or
// Supabase, and reuses the one canonical renderer.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/savedResumeView.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { withFormDataDefaults, EMPTY_RESUME_FORM_DATA, isResumeEmpty } from "@/lib/resume/importResume";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");
const MODAL = read("../src/app/components/resume-builder/ResumeViewModal.tsx");

// ── Snapshot normalization (behavioral) ─────────────────────────────────────────
test("EMPTY_RESUME_FORM_DATA is a fully-empty résumé", () => {
  assert.equal(isResumeEmpty(EMPTY_RESUME_FORM_DATA), true);
  assert.deepEqual(EMPTY_RESUME_FORM_DATA.projects, []);
  assert.deepEqual(EMPTY_RESUME_FORM_DATA.certifications, []);
});

test("withFormDataDefaults fills missing sections for an OLD saved résumé (projects/certs → [])", () => {
  const old = { fullName: "Nastya", skills: ["React"], summary: "Hi" } as Partial<ResumeFormData>;
  const out = withFormDataDefaults(old);
  assert.deepEqual(out.projects, []);
  assert.deepEqual(out.certifications, []);
  assert.equal(out.fullName, "Nastya");
  assert.deepEqual(out.skills, ["React"]);
});

test("withFormDataDefaults preserves genuine projects & certifications from the saved record", () => {
  const saved: Partial<ResumeFormData> = {
    fullName: "A",
    projects: [{ id: "p1", name: "Boho Padel", role: "Dev", startDate: "", endDate: "", current: true, description: "Booking flow", url: "https://x" }],
    certifications: [{ id: "c1", name: "AWS SAA", issuer: "Amazon", issueDate: "2023", expirationDate: "", credentialId: "", credentialUrl: "" }],
  };
  const out = withFormDataDefaults(saved);
  assert.equal(out.projects.length, 1);
  assert.equal(out.projects[0].name, "Boho Padel");
  assert.equal(out.certifications[0].issuer, "Amazon");
});

test("withFormDataDefaults never mutates its input (read-only snapshot)", () => {
  const old = { fullName: "X" } as Partial<ResumeFormData>;
  const before = JSON.stringify(old);
  const out = withFormDataDefaults(old);
  assert.equal(JSON.stringify(old), before, "input untouched");
  out.projects.push({ id: "z", name: "n", role: "", startDate: "", endDate: "", current: false, description: "", url: "" });
  assert.deepEqual(EMPTY_RESUME_FORM_DATA.projects, [], "shared default array not polluted");
});

// ── Saved-resume card exposes a distinct View action ─────────────────────────────
test("each saved résumé card exposes View, Edit and Delete as distinct actions", () => {
  assert.ok(/onView: \(\) => void/.test(CLIENT), "ResumeCard takes onView");
  assert.ok(/onClick=\{onView\}/.test(CLIENT), "View button wired to onView");
  assert.ok(/onClick=\{onOpen\}/.test(CLIENT), "Edit button wired to onOpen");
  assert.ok(/onClick=\{onDelete\}/.test(CLIENT), "Delete button wired to onDelete");
  assert.ok(/>\s*View\s*</.test(CLIENT), "a 'View' label exists");
  // onView is threaded from the section down to the card and up to a handler.
  assert.ok(/onView=\{\(\) => onView\(record\)\}/.test(CLIENT), "card onView calls section onView(record)");
  assert.ok(/onView=\{handleView\}/.test(CLIENT), "section receives handleView");
});

// ── handleView is strictly read-only ─────────────────────────────────────────────
test("handleView builds a snapshot and mutates nothing (no setFormData/settings/resumeId/Supabase/AI)", () => {
  const start = CLIENT.indexOf("const handleView = useCallback");
  const end = CLIENT.indexOf("}, []);", start);
  assert.ok(start >= 0 && end > start, "handleView present");
  const body = CLIENT.slice(start, end);
  assert.ok(body.includes("withFormDataDefaults(record.content?.formData)"), "snapshot normalized");
  assert.ok(body.includes("setViewState({"), "opens the view state only");
  for (const forbidden of ["setFormData(", "setSettings(", "setResumeId(", "supabase", "handleSave", "loadRecord("]) {
    assert.ok(!body.includes(forbidden), `handleView must not call ${forbidden}`);
  }
});

test("opening View preserves unsaved builder state — it never writes formData/settings/resumeId", () => {
  // The only writer of viewState is handleView; the only readers are the modal
  // render + handleViewEdit. Nothing in the view path touches the builder setters.
  assert.ok(/setViewState\(\{/.test(CLIENT), "view uses its own isolated state");
  // handleViewEdit is the ONLY place a view turns into an edit (explicit action).
  const he = CLIENT.slice(CLIENT.indexOf("const handleViewEdit"), CLIENT.indexOf("const handleDelete"));
  assert.ok(he.includes("requestLoadRecord(current.record)"), "Edit-from-view goes through the guarded load path");
  assert.ok(/const requestLoadRecord[\s\S]*loadRecord\(record\)/.test(CLIENT), "guarded path ultimately calls loadRecord");
  assert.ok(he.includes("return null"), "Edit-from-view closes the modal");
});

// ── Edit / Delete regressions ────────────────────────────────────────────────────
test("Edit still loads the saved résumé via loadRecord; Delete still calls handleDelete", () => {
  assert.ok(/onOpen=\{requestLoadRecord\}/.test(CLIENT), "Edit/Open wired to the guarded requestLoadRecord");
  assert.ok(/const requestLoadRecord[\s\S]*loadRecord\(record\)/.test(CLIENT), "guard still loads via loadRecord");
  assert.ok(/onDelete=\{handleDelete\}/.test(CLIENT), "Delete still wired to handleDelete");
  assert.ok(/const handleDelete = async \(id: string\) => \{/.test(CLIENT), "handleDelete unchanged in shape");
});

// ── Modal: reuses the canonical renderer, read-only, accessible ──────────────────
test("View modal reuses ResumePreview (no second renderer) with a distinct DOM id", () => {
  assert.ok(/import ResumePreview from/.test(MODAL), "uses ResumePreview");
  assert.ok(/<ResumePreview[\s\S]*domId="resume-view-modal"/.test(MODAL), "distinct domId, not the builder's");
  assert.ok(!/resumeToText|SectionHeading|function .*Layout/.test(MODAL), "no duplicate résumé rendering logic");
});

test("View modal is purely presentational — no data mutation, Supabase, AI, or analysis", () => {
  for (const forbidden of ["supabase", "setFormData", "/api/resume", "computeResumeStrength", "matchResumeToJob", "postResumeAI"]) {
    assert.ok(!MODAL.includes(forbidden), `modal must not reference ${forbidden}`);
  }
});

test("View modal is an accessible dialog: role, aria-modal, Escape, scroll-lock, close + edit", () => {
  assert.ok(/role="dialog"/.test(MODAL) && /aria-modal="true"/.test(MODAL), "dialog semantics");
  assert.ok(/e\.key === "Escape"/.test(MODAL), "Escape closes");
  assert.ok(/document\.body\.style\.overflow = "hidden"/.test(MODAL), "locks background scroll");
  assert.ok(/aria-label="Close preview"/.test(MODAL), "visible close button");
  assert.ok(/onClick=\{onEdit\}/.test(MODAL) && /Edit this résumé/.test(MODAL), "offers Edit this résumé");
  assert.ok(/dialogRef\.current\?\.focus\(\)/.test(MODAL), "moves focus into the dialog");
});
