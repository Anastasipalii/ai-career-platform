// Tests for the DRY-RUN application preparation flow. Pure logic — no network,
// no Supabase, no DOM. Also source-scans the feature to prove it can never
// submit an application, send email, automate a browser, or POST externally.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/application.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { APPLICATION_STAGES, IS_DRY_RUN, type ApplicationDraft } from "@/lib/application/types";
import { evaluateReadiness, prepareApplicationPackage, buildReadinessChecklist } from "@/lib/application/prepare";
import { runDryRun, buildApplicationPayload } from "@/lib/application/dryRun";

const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/([^:])\/\/.*$/gm, "$1");

const draft = (o: Partial<ApplicationDraft> = {}): ApplicationDraft => ({
  createdAt: "2026-07-15T00:00:00.000Z",
  workflowRunId: "wf-1",
  job: {
    externalId: "job-1", title: "Frontend Developer", company: "Acme", location: "Berlin",
    provider: "arbeitnow", jobTypes: ["full-time"], sourceUrl: "https://arbeitnow.com/jobs/job-1", matchScore: 82,
    ...(o.job ?? {}),
  },
  atsScore: 78, profession: "Frontend Developer", resumeLanguage: "English", resumeName: "resume.pdf",
  resumeAnalyzed: true, candidateProfilePresent: true, coverLetterPresent: true, coverLetterPreview: "Dear hiring team, I am ...",
  ...o,
});
const noSleep = () => Promise.resolve();
const clock = () => { let t = 0; return () => (t += 10); };

// ── readiness validation ──────────────────────────────────────────────────────
test("a complete draft is ready and has no missing items", () => {
  const r = evaluateReadiness(draft());
  assert.equal(r.ready, true);
  assert.deepEqual(r.missingItems, []);
  assert.equal(r.checklist.resumeExists, true);
  assert.equal(r.checklist.coverLetterExists, true);
  assert.equal(r.checklist.externalUrlAvailable, true);
});

test("missing resume blocks readiness", () => {
  const r = evaluateReadiness(draft({ resumeName: "" }));
  assert.equal(r.ready, false);
  assert.ok(r.missingItems.some((m) => /resume provided/i.test(m)));
});

test("missing cover letter blocks readiness", () => {
  const r = evaluateReadiness(draft({ coverLetterPresent: false }));
  assert.equal(r.ready, false);
  assert.ok(r.missingItems.some((m) => /cover letter/i.test(m)));
});

test("missing external URL is a warning, NOT a blocker", () => {
  const r = evaluateReadiness(draft({ job: { title: "Nurse", matchScore: 60 } }));
  assert.equal(r.checklist.externalUrlAvailable, false);
  assert.equal(r.ready, true); // still ready — dry run never submits
  assert.ok(r.warnings.length > 0);
});

test("checklist requires a non-empty job title", () => {
  const c = buildReadinessChecklist(draft({ job: { title: "  ", matchScore: 0 } }));
  assert.equal(c.requiredFieldsValid, false);
  assert.equal(c.vacancySelected, false);
});

// ── AI agent fallback (deterministic package) ─────────────────────────────────
test("deterministic agent produces a complete, valid package", () => {
  const pkg = prepareApplicationPackage(draft());
  assert.equal(pkg.source, "deterministic");
  assert.ok(["ready", "needs_attention"].includes(pkg.readinessStatus));
  assert.ok(pkg.confidenceScore >= 0 && pkg.confidenceScore <= 100);
  assert.equal(pkg.packageChecklist.length, 7);
  assert.ok(pkg.applicationSummary.includes("No application will be sent"));
  assert.ok(Array.isArray(pkg.recommendedAdjustments));
});

test("agent reports not_ready with missing items when incomplete", () => {
  const pkg = prepareApplicationPackage(draft({ resumeName: "", coverLetterPresent: false }));
  assert.equal(pkg.readinessStatus, "not_ready");
  assert.ok(pkg.missingItems.length >= 2);
});

// ── successful dry run ────────────────────────────────────────────────────────
test("a ready draft runs the full dry run, never submits", async () => {
  const seen: string[] = [];
  const res = await runDryRun({
    draft: draft(), applicationRunKey: "app-key-1", sleep: noSleep, now: clock(),
    onStage: (e) => seen.push(`${e.status}:${e.stage}`),
  });
  assert.equal(res.ok, true);
  assert.equal(res.isDryRun, true);
  assert.equal(res.submitted, false); // hard guarantee
  // one begin + one complete per stage, in order, ending at dry_run_completed
  const completed = res.stages.filter((s) => s.status === "completed").map((s) => s.stage);
  assert.deepEqual(completed, [...APPLICATION_STAGES]);
  assert.equal(completed.at(-1), "dry_run_completed");
  assert.equal(seen.filter((s) => s.startsWith("running:")).length, APPLICATION_STAGES.length);
  assert.equal(seen.filter((s) => s.startsWith("completed:")).length, APPLICATION_STAGES.length);
  assert.ok(res.payload && res.payload.isDryRun === true);
});

test("dry-run payload carries only references — no raw résumé/cover text", async () => {
  const d = draft({ coverLetterPreview: "SECRET_COVER_TEXT_XYZ" });
  const payload = buildApplicationPayload(d, "app-key-2");
  const json = JSON.stringify(payload);
  assert.ok(!json.includes("SECRET_COVER_TEXT_XYZ"), "payload must not contain cover-letter text");
  assert.ok(json.includes("cover_letter:generated")); // reference only
  assert.ok(json.includes("resume:resume.pdf")); // reference only
  assert.equal(payload.isDryRun, true);
});

// ── failed validation ─────────────────────────────────────────────────────────
test("an unready draft never proceeds and never submits", async () => {
  const res = await runDryRun({
    draft: draft({ coverLetterPresent: false }), applicationRunKey: "app-key-3", sleep: noSleep, now: clock(),
  });
  assert.equal(res.ok, false);
  assert.equal(res.submitted, false);
  assert.deepEqual(res.stages, []);
  assert.equal(res.payload, null);
  assert.equal(res.validation.valid, false);
  assert.ok(res.validation.missing.length > 0);
});

// ── SAFETY: no external submission is technically reachable ───────────────────
test("application modules make NO network/email/browser/employer calls", () => {
  for (const rel of [
    "../src/lib/application/prepare.ts",
    "../src/lib/application/dryRun.ts",
    "../src/lib/application/types.ts",
    "../src/lib/application/applicationDraft.ts",
    "../src/lib/application/applicationRun.ts",
  ]) {
    const code = readCode(rel);
    assert.ok(!/\bfetch\s*\(/.test(code), `${rel} must not call fetch`);
    assert.ok(!/\baxios\b|\bgot\b\(|node-fetch/.test(code), `${rel} must not use an HTTP client`);
    assert.ok(!/nodemailer|sendmail|smtp|sendgrid|mailgun/i.test(code), `${rel} must not send email`);
    assert.ok(!/puppeteer|playwright|webdriver|selenium/i.test(code), `${rel} must not automate a browser`);
    assert.ok(!/employer|webhook|\.submit\s*\(/i.test(code), `${rel} must not submit anywhere`);
  }
});

test("the prepare route's only outbound call is OpenAI; it never submits", () => {
  const code = readCode("../src/app/api/application/prepare/route.ts");
  assert.ok(!/\bfetch\s*\(/.test(code), "route must not fetch employer endpoints");
  assert.ok(!/nodemailer|smtp|sendgrid|mailgun/i.test(code));
  assert.ok(!/puppeteer|playwright|webdriver/i.test(code));
  assert.ok(/openai/i.test(code), "route uses OpenAI for enrichment only");
  assert.ok(/prepareApplicationPackage/.test(code), "route falls back to deterministic prep");
});

test("is_dry_run is always true and hardcoded in the payload/type", () => {
  assert.equal(IS_DRY_RUN, true);
  const payload = buildApplicationPayload(draft(), "k");
  assert.equal(payload.isDryRun, true);
});

// ── Monitoring + Dashboard integration (repo shape) ───────────────────────────
test("application repo persists ONLY safe metadata (no raw text) and is dry-run-locked", () => {
  const code = readCode("../src/lib/application/applicationRun.ts");
  // never inserts résumé/cover/prompt text or secrets into events
  assert.ok(!/resumeText|resume_text|cover_letter_text|coverLetterText|prompt|api[_-]?key|secret/i.test(code));
  // is_dry_run is written as the constant true, never a variable that could be false
  assert.ok(/is_dry_run:\s*IS_DRY_RUN/.test(code));
  // reads target ONLY the application_ tables
  const froms = [...code.matchAll(/\.from\((["'])([a-z_]+)\1\)/g)].map((m) => m[2]);
  for (const t of froms) assert.ok(["application_runs", "application_events"].includes(t), `unexpected table ${t}`);
});

test("monitoring/dashboard read application runs read-only (no delete)", () => {
  const code = readCode("../src/lib/application/applicationRun.ts");
  assert.ok(!/\.delete\s*\(/.test(code), "no delete of application data");
});

// ── Monitoring integration ────────────────────────────────────────────────────
test("Monitoring Dashboard renders the dry-run applications view", () => {
  const client = readCode("../src/app/components/admin/MonitoringClient.tsx");
  assert.ok(/ApplicationMonitoring/.test(client), "MonitoringClient must render ApplicationMonitoring");

  const view = readCode("../src/app/components/admin/ApplicationMonitoring.tsx");
  assert.ok(!/\.from\(/.test(view), "monitoring UI must go through the repository, not supabase directly");
  assert.ok(/readAllApplicationRunsAdmin|readApplicationEventsForRun/.test(view));
  assert.ok(/dry_run/.test(view), "timeline/table must label mode dry_run");
  assert.ok(!/\.delete\s*\(/.test(view));
});

// ── Dashboard integration ─────────────────────────────────────────────────────
test("Dashboard renders a Prepared Applications section with a Dry Run badge", () => {
  const dash = readCode("../src/app/components/dashboard/DashboardClient.tsx");
  assert.ok(/PreparedApplications/.test(dash), "Dashboard must render PreparedApplications");

  const section = readCode("../src/app/components/dashboard/PreparedApplications.tsx");
  assert.ok(/readRecentApplicationRuns/.test(section), "section reads via the repository");
  assert.ok(!/\.from\(/.test(section), "dashboard UI must not query supabase directly");
  assert.ok(/Dry Run/i.test(section), "section shows a Dry Run badge");
});

// ── Entry point preserved ─────────────────────────────────────────────────────
test("job cards keep View & apply AND add a Prepare Application button", () => {
  const results = readCode("../src/app/components/ai-workflow/WorkflowResults.tsx");
  assert.ok(/Prepare Application/.test(results), "adds Prepare Application");
  assert.ok(/View &amp; apply|View & apply/.test(results), "keeps the external View & apply link");
  assert.ok(/saveApplicationDraft/.test(results));
});

// ── Preview page safety ───────────────────────────────────────────────────────
test("Application Preview shows the TEST MODE / DRY RUN banner and never submits", () => {
  const client = readCode("../src/app/components/apply/ApplyPreviewClient.tsx");
  assert.ok(/Test mode|DRY RUN|Dry run/i.test(client), "banner present");
  assert.ok(/No real application was sent|No real application will be sent/i.test(client));
  // the only POST is to our own internal prepare route (never an employer/webhook)
  const posts = [...client.matchAll(/fetch\(\s*(["'`])([^"'`]+)\1/g)].map((m) => m[2]);
  for (const url of posts) assert.ok(url.startsWith("/api/application/"), `unexpected fetch target ${url}`);
});
