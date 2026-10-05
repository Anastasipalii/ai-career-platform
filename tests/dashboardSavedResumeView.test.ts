// Phase C Step 1.1a — Dashboard → Saved Resumes read-only View.
// Dashboard components are client + Supabase, so these lock the behavior via
// source contracts (reusing the behaviorally-tested withFormDataDefaults for the
// snapshot). They assert: a distinct View action, existing Edit/PDF + Rename +
// Delete kept, on-demand content is a READ only, and the shared modal is reused.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/dashboardSavedResumeView.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT = read("../src/app/components/dashboard/DashboardClient.tsx");
const LIST = read("../src/app/components/dashboard/SavedResumes.tsx");

// ── The card exposes View plus the existing actions ─────────────────────────────
test("Dashboard saved-résumé card exposes View, Edit / PDF, Rename and Delete", () => {
  assert.ok(/onView: \(id: string\) => void/.test(LIST), "SavedResumes takes onView");
  assert.ok(/onClick=\{\(\) => onView\(resume\.id\)\}/.test(LIST), "View button wired to onView(id)");
  assert.ok(/>\s*\{viewLoadingId === resume\.id \? "Loading…" : "View"\}/.test(LIST), "View label with loading state");
  assert.ok(/Edit \/ PDF/.test(LIST) && /href=\{`\/resume-builder\?id=\$\{resume\.id\}`\}/.test(LIST), "Edit / PDF link kept");
  assert.ok(/onClick=\{\(\) => startRename\(resume\.id, resume\.title\)\}/.test(LIST), "Rename kept");
  assert.ok(/onClick=\{\(\) => setConfirmDeleteId\(resume\.id\)\}/.test(LIST), "Delete kept");
});

test("View is hidden for the synthetic workflow-only row (no saved record to view)", () => {
  assert.ok(/resume\.id !== "wf-resume" &&/.test(LIST), "View gated off for wf-resume");
});

// ── Existing Rename / Delete semantics unchanged ────────────────────────────────
test("Rename and Delete still perform their Supabase writes (unchanged)", () => {
  assert.ok(/const handleDeleteResume = async \(id: string\) => \{[\s\S]*from\("resumes"\)\.delete\(\)\.eq\("id", id\)/.test(CLIENT), "delete unchanged");
  assert.ok(/const handleRenameResume = async \(id: string, title: string\) => \{[\s\S]*update\(\{ title: clean \}\)/.test(CLIENT), "rename unchanged");
});

// ── handleViewResume is read-only ───────────────────────────────────────────────
test("handleViewResume fetches content READ-only and mutates nothing", () => {
  const start = CLIENT.indexOf("const handleViewResume = useCallback");
  const end = CLIENT.indexOf("const handleViewEdit", start);
  assert.ok(start >= 0 && end > start, "handleViewResume present");
  const body = CLIENT.slice(start, end);
  assert.ok(/\.select\("content, title"\)/.test(body), "reads content by id");
  assert.ok(body.includes('if (id === "wf-resume") return;'), "guards the synthetic row");
  assert.ok(body.includes("withFormDataDefaults(content.formData)"), "normalizes old résumés safely");
  assert.ok(body.includes("content.settings ?? DEFAULT_VIEW_SETTINGS"), "respects saved settings, else default");
  assert.ok(body.includes("setViewResume({"), "opens view state only");
  for (const forbidden of [".update(", ".delete(", ".insert(", ".upsert(", "/api/resume", "computeResumeStrength", "matchResumeToJob", "postResumeAI", "setResumes("]) {
    assert.ok(!body.includes(forbidden), `handleViewResume must not ${forbidden}`);
  }
});

test("Edit-from-view uses the existing Dashboard→Builder route and closes", () => {
  const he = CLIENT.slice(CLIENT.indexOf("const handleViewEdit"), CLIENT.indexOf("const handleDeleteResume"));
  assert.ok(/router\.push\(`\/resume-builder\?id=\$\{current\.id\}`\)/.test(he), "routes to builder with id");
  assert.ok(/return null/.test(he), "closes the modal");
});

// ── Reuse of the shared modal (no second renderer) ──────────────────────────────
test("Dashboard reuses the shared ResumeViewModal and withFormDataDefaults", () => {
  assert.ok(/import ResumeViewModal from "@\/app\/components\/resume-builder\/ResumeViewModal"/.test(CLIENT), "reuses the modal");
  assert.ok(/import \{ withFormDataDefaults \} from "@\/lib\/resume\/importResume"/.test(CLIENT), "reuses the normalizer");
  assert.ok(/<ResumeViewModal[\s\S]*onEdit=\{handleViewEdit\}/.test(CLIENT), "modal rendered with edit handler");
  // No duplicate résumé rendering logic on the dashboard surface.
  assert.ok(!/SectionHeading|resumeToText|function .*Layout\(/.test(CLIENT), "no second résumé renderer");
});
