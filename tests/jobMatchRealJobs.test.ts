// Contract tests for Job Match Step 2 — REAL JOBS ONLY. The standalone tool must
// display only real provider listings; AI may rank but never create/alter a job.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/jobMatchRealJobs.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT  = read("../src/app/components/job-match/JobMatchClient.tsx");
const RESULTS = read("../src/app/components/job-match/JobMatchResults.tsx");
const ACTIONS = read("../src/app/components/job-match/JobMatchActions.tsx");
const UPLOAD  = read("../src/app/components/job-match/JobMatchUpload.tsx");
const AGENT   = read("../src/app/api/job-match/agent/route.ts");

// ── Old fabricated path is gone ───────────────────────────────────────────────
test("standalone no longer calls /api/job-match/analyze", () => {
  assert.ok(!/job-match\/analyze/.test(CLIENT), "client must not reference the fabrication route");
});

test("no MOCK_JOBS / fabricated fallback in the live UI", () => {
  assert.ok(!/MOCK_JOBS/.test(CLIENT), "client never uses MOCK_JOBS");
  assert.ok(!/MOCK_JOBS/.test(RESULTS), "results never fall back to MOCK_JOBS");
});

// ── Real pipeline ─────────────────────────────────────────────────────────────
test("standalone uses /api/jobs/search then /api/job-match/agent", () => {
  assert.ok(CLIENT.includes('authedFetch("/api/jobs/search"'), "calls the real provider search");
  assert.ok(CLIENT.includes('authedFetch("/api/job-match/agent"'), "ranks via the agent");
  // Real provider jobs are what gets ranked.
  assert.ok(/jobs:\s*providerJobs/.test(CLIENT), "passes the real provider jobs to the agent");
});

test("zero provider jobs → zero displayed jobs (no fallback)", () => {
  assert.ok(/providerJobs\.length === 0/.test(CLIENT), "handles the empty-provider case");
  assert.ok(/setJobs\(\[\]\)/.test(CLIENT), "shows zero results, not substitutes");
});

test("provider/search failure shows a truthful error, never fabricated jobs", () => {
  assert.ok(/setSearchError\(/.test(CLIENT), "sets a truthful error");
  assert.ok(/Live job data unavailable/.test(RESULTS), "results renders a truthful failure state");
});

// ── Job identity is immutable (from the provider, not the model) ──────────────
test("AI cannot add a job — only ids that map to a real provider job survive", () => {
  assert.ok(/byId\.has\(m\.externalId\)/.test(CLIENT), "discards any match whose id is not a real provider job");
});

test("displayed identity fields come from the provider job (j.*), not the model (m.*)", () => {
  // Identity is assembled once in fromProvider() straight off the provider job.
  const FROM_PROVIDER = CLIENT.slice(CLIENT.indexOf("const fromProvider"), CLIENT.indexOf("let ranked"));
  for (const [field, src] of [["externalId", "j.externalId"], ["provider", "j.provider"], ["title", "j.title"], ["company", "j.company"], ["location", "j.location"], ["applyUrl", "j.applyUrl"], ["sourceUrl", "j.sourceUrl"]] as const) {
    assert.ok(new RegExp(`${field}:\\s*${src.replace(".", "\\.")}`).test(FROM_PROVIDER), `identity field sourced from provider: ${field}`);
  }
  // The model's title/company are never used as identity.
  assert.ok(!/title:\s*m\.title/.test(CLIENT), "never uses the model's title as identity");
  assert.ok(!/company:\s*m\.company/.test(CLIENT), "never uses the model's company as identity");
});

test("ranking failure falls back to REAL provider jobs unranked (no fabrication)", () => {
  // else-branch maps providerJobs directly with a neutral score.
  assert.ok(/ranked = providerJobs\.map/.test(CLIENT), "falls back to the real provider jobs");
});

test("agent route still enforces provider identity + discards invented ids", () => {
  assert.ok(/byId\.get\(id\)/.test(AGENT) && /discard any invented id/.test(AGENT), "agent id-whitelists");
  assert.ok(/NEVER invent jobs, companies, titles, URLs/.test(AGENT), "agent forbids invention");
});

// ── Apply links are provider-sourced and safe ────────────────────────────────
test("apply link uses only a provider URL, validated, and opens safely", () => {
  assert.ok(/safeHref\(job\.applyUrl\)\s*\?\?\s*safeHref\(job\.sourceUrl\)/.test(RESULTS), "apply URL is a validated provider URL (applyUrl→sourceUrl)");
  assert.ok(/target="_blank"/.test(RESULTS) && /rel="noopener noreferrer"/.test(RESULTS), "external link safety");
  assert.ok(/No application link provided/.test(RESULTS), "hides apply when no safe URL exists");
  // No AI-constructed URLs.
  assert.ok(!/https?:\/\//.test(RESULTS) || !/applyUrl\s*=\s*`/.test(RESULTS), "no constructed application URLs");
});

// ── Honest actions + functional upload ────────────────────────────────────────
test("misleading controls removed/fixed: no fake Save, real Copy", () => {
  assert.ok(!/Save Job Match/.test(ACTIONS), "fake Save button removed (persistence pending migration)");
  assert.ok(/navigator\.clipboard/.test(ACTIONS) && /await navigator\.clipboard\.writeText/.test(ACTIONS), "Copy actually writes to the clipboard");
  assert.ok(/setCopied\(true\);\s*\/\/ only after a SUCCESSFUL copy/.test(ACTIONS), "success reported only after a real copy");
});

test("résumé upload is genuinely functional (client-side parse; bytes never sent)", () => {
  assert.ok(/parseResumeFile/.test(UPLOAD), "parses the résumé client-side");
  assert.ok(/onParsed\(/.test(UPLOAD), "passes extracted text up");
  assert.ok(!/fetch\(/.test(UPLOAD), "upload never sends the file anywhere");
  // Client sends only extracted text to the AGENT (never to the provider search).
  assert.ok(/resumeText:\s*resumeText \|\| undefined/.test(CLIENT), "only extracted text goes to the ranking agent");
  const searchCall = CLIENT.slice(CLIENT.indexOf('authedFetch("/api/jobs/search"'), CLIENT.indexOf('authedFetch("/api/job-match/agent"'));
  assert.ok(!/resumeText/.test(searchCall), "résumé text is never sent to the job provider search");
});

// ── Persistence is EXPLICIT, never automatic (Step 3) ─────────────────────────
const SAVE_HANDLER = CLIENT.slice(CLIENT.indexOf("const handleSaveJob"), CLIENT.indexOf("const handleDeleteSaved"));
const SEARCH_HANDLER = CLIENT.slice(CLIENT.indexOf("const handleSearch"), CLIENT.indexOf("const handleSaveJob"));

test("results are never auto-persisted — the only insert lives in handleSaveJob", () => {
  // Search must NOT write to the DB; saving is a separate, explicit action.
  assert.ok(!/\.insert\(/.test(SEARCH_HANDLER), "handleSearch never inserts a job_matches row");
  assert.ok(/supabase\.from\("job_matches"\)\.insert\(/.test(SAVE_HANDLER), "the insert lives in the explicit save handler");
  // The Save button is user-driven (passed down to each card), not fired on search.
  assert.ok(/onSave=\{handleSaveJob\}/.test(CLIENT), "save is wired to an explicit per-card action");
});

test("only a REAL provider job can be saved (both identity fields required)", () => {
  assert.ok(/if \(!job\.provider \|\| !job\.externalId\)/.test(SAVE_HANDLER), "rejects anything lacking provider identity");
});

test("saved row persists PROVIDER identity + provenance (not model-created)", () => {
  for (const line of [
    "job_title:            job.title",
    "company_name:         job.company",
    "provider:             job.provider",
    "provider_job_id:      job.externalId",
    "source_url:           job.sourceUrl || null",
    "apply_url:            job.applyUrl || null",
  ]) {
    assert.ok(SAVE_HANDLER.includes(line), `persists provider field: ${line.split(":")[0]}`);
  }
  // Unranked jobs store NULL, never a fake 0 score.
  assert.ok(/match_score:\s+job\.matchScore > 0 \? job\.matchScore : null/.test(SAVE_HANDLER), "stores null for unranked, not a fabricated score");
});

test("duplicate save is graceful — unique violation never creates a 2nd row or a false error", () => {
  assert.ok(/code === "23505"/.test(SAVE_HANDLER), "treats the DB unique violation as already-saved");
  assert.ok(/Already saved to your dashboard/.test(SAVE_HANDLER), "reports already-saved, not an error");
  // Client-side guard also prevents a redundant insert.
  assert.ok(/if \(savedKeys\.has\(key\)\)/.test(SAVE_HANDLER), "skips the insert when already saved in this session");
});

// ── Saved-match review (View) ─────────────────────────────────────────────────
const REVIEW_EFFECT = CLIENT.slice(CLIENT.indexOf("if (!initialSavedId) return;"), CLIENT.indexOf("const handleResumeParsed"));

test("saved view reads owner-scoped (user_id) on top of RLS", () => {
  assert.ok(/\.from\("job_matches"\)/.test(REVIEW_EFFECT), "reads the saved row");
  assert.ok(/\.eq\("id", initialSavedId\)/.test(REVIEW_EFFECT), "scoped to the requested id");
  assert.ok(/\.eq\("user_id", session\.user\.id\)/.test(REVIEW_EFFECT), "additionally owner-scoped");
  assert.ok(/\.single\(\)/.test(REVIEW_EFFECT), "expects exactly one owned row");
});

test("saved view makes NO AI call and does not re-fetch listings", () => {
  assert.ok(!/\/api\/job-match\/agent/.test(REVIEW_EFFECT), "no ranking call when viewing a saved job");
  assert.ok(!/\/api\/jobs\/search/.test(REVIEW_EFFECT), "no provider re-fetch when viewing a saved job");
});

test("saved view apply uses ONLY the stored provider URL, validated; legacy rows get none", () => {
  assert.ok(/safeHref\(review\.apply_url \?\? ""\) \?\? safeHref\(review\.source_url \?\? ""\)/.test(CLIENT), "apply = safe(apply_url) ?? safe(source_url)");
  assert.ok(/verified && apply \?/.test(CLIENT), "apply link shown only when provider-verified AND safe");
  assert.ok(/No live application link is stored/.test(CLIENT), "legacy/no-safe-URL rows show no apply link");
  // Verified means BOTH provenance fields are present; legacy rows are never "verified".
  assert.ok(/const verified = !!\(review && review\.provider && review\.provider_job_id\)/.test(CLIENT), "verified requires both provenance fields");
  assert.ok(/Unverified saved record/.test(CLIENT), "legacy rows are labelled unverified, never provider-verified");
});

// ── Delete ────────────────────────────────────────────────────────────────────
const DELETE_HANDLER = CLIENT.slice(CLIENT.indexOf("const handleDeleteSaved"), CLIENT.indexOf("const keywords"));

test("delete is owner-scoped and requires explicit confirmation", () => {
  assert.ok(/\.delete\(\)\s*\n?\s*\.eq\("id", review\.id\)\s*\n?\s*\.eq\("user_id", session\.user\.id\)/.test(DELETE_HANDLER), "delete is scoped to the owned row");
  assert.ok(/confirmDelete \?/.test(CLIENT) && /setConfirmDelete\(true\)/.test(CLIENT), "delete requires a confirm step");
});

// ── Dashboard consistency ─────────────────────────────────────────────────────
const DASH   = read("../src/app/components/dashboard/DashboardClient.tsx");
const WIDGET = read("../src/app/components/dashboard/JobMatchesWidget.tsx");

test("dashboard reads provenance columns and tags table rows as saved", () => {
  assert.ok(/provider, provider_job_id, source_url, apply_url/.test(DASH), "selects the provenance columns");
  assert.ok(/isSaved: true/.test(DASH), "table rows are tagged saved (so the widget can offer View)");
});

test("widget View link opens the saved match page only for real saved rows", () => {
  assert.ok(/\/job-match\?id=\$\{match\.id\}/.test(WIDGET), "links to the saved match view");
  assert.ok(/!match\.id\.startsWith\("wf-"\)/.test(WIDGET), "excludes synthetic workflow-run rows from the saved view link");
});

test("widget never constructs an apply URL and never implies verification for legacy rows", () => {
  assert.ok(/safeHref\(/.test(WIDGET), "apply link is validated through safeHref");
  assert.ok(/const verified = !!\(match\.provider && match\.provider_job_id\)/.test(WIDGET), "verification requires both provenance fields");
  assert.ok(/isSavedRow \? verified && !!apply/.test(WIDGET), "saved rows show apply only when provider-verified");
  // No string-built external URLs in the widget.
  assert.ok(!/href=\{`https?:/.test(WIDGET), "no constructed apply URLs");
});
