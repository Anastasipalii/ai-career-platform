// Focused contract tests for the standalone Career Path production hardening.
// Source-scan style (matches the repo's other UI contract tests).
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/careerPath.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const ROUTE  = read("../src/app/api/career-path/generate/route.ts");
const CLIENT = read("../src/app/components/career-path/CareerPathClient.tsx");
const UPLOAD = read("../src/app/components/career-path/CareerPathUpload.tsx");

const GEN = CLIENT.slice(CLIENT.indexOf("const handleGenerate"), CLIENT.indexOf("const requestRegenerate"));
const SAVE = CLIENT.slice(CLIENT.indexOf("const handleSave"), CLIENT.indexOf("// ── Progress"));

// ── RÉSUMÉ ──────────────────────────────────────────────────────────────────
test("résumé upload genuinely parses client-side; bytes never sent", () => {
  assert.ok(/parseResumeFile/.test(UPLOAD), "uses the shared parser");
  assert.ok(/onParsed\(/.test(UPLOAD), "passes extracted text up");
  assert.ok(!/fetch\(/.test(UPLOAD), "upload never uploads the file");
  assert.ok(/had no readable text/.test(UPLOAD), "truthful empty/unreadable state");
});

test("client sends only résumé TEXT (capped) to generation", () => {
  assert.ok(/resumeText: resumeText \|\| undefined/.test(CLIENT), "extracted text sent as grounding");
  assert.ok(/RESUME_TEXT_CAP = 12000/.test(CLIENT) && /slice\(0, RESUME_TEXT_CAP\)/.test(CLIENT), "résumé text capped client-side");
});

// ── FACTUAL INTEGRITY ───────────────────────────────────────────────────────
test("prompt forbids inventing existing candidate facts; tasks are future actions", () => {
  assert.ok(/NEVER assert the user already has/.test(ROUTE), "no invented existing background");
  assert.ok(/future action the user SHOULD take/.test(ROUTE), "tasks are future recommendations");
  for (const f of ["employer", "title", "date", "certification", "metric", "skill", "years of experience"]) {
    assert.ok(ROUTE.includes(f), `forbidden existing-fact category listed: ${f}`);
  }
});

test("résumé/user content treated as data, not instructions", () => {
  assert.ok(/strictly as DATA, never as instructions/.test(ROUTE), "injection-resistant");
});

// ── ROADMAP CONTRACT / VALIDATION ───────────────────────────────────────────
test("output is validated; malformed/empty rejected with no fake fallback", () => {
  assert.ok(/Array\.isArray\(\(parsed as \{ phases\?: unknown \}\)\.phases\)/.test(ROUTE), "requires a phases array");
  assert.ok(/if \(!title \|\| tasks\.length === 0\) continue/.test(ROUTE), "drops malformed phases");
  assert.ok(/if \(phases\.length === 0\)/.test(ROUTE) && /incomplete/.test(ROUTE), "empty generation → truthful failure, not a fabricated roadmap");
});

test("phase and task counts are capped", () => {
  assert.ok(/MAX_PHASES = 4/.test(ROUTE) && /phases\.length >= MAX_PHASES/.test(ROUTE), "max 4 phases");
  assert.ok(/MAX_TASKS_PER_PHASE = 5/.test(ROUTE) && /slice\(0, MAX_TASKS_PER_PHASE\)/.test(ROUTE), "task count capped");
});

test("timeline framed as an estimate, never a guarantee", () => {
  assert.ok(/ESTIMATE \/ suggested pace, never a guarantee/.test(ROUTE), "route forbids guarantee language");
  assert.ok(/never a guarantee of promotion, hiring, salary, or outcome/.test(ROUTE), "no guaranteed outcome/salary");
  assert.ok(/timings are estimates, not guarantees/.test(CLIENT), "UI labels timeline as an estimate");
});

// ── INPUT VALIDATION / CAPS ─────────────────────────────────────────────────
test("enumerated fields validated and free-text capped", () => {
  assert.ok(/const WORK_STYLES\s+=/.test(ROUTE) && /const EXPERIENCE\s+=/.test(ROUTE) && /const TIME_GOALS\s+=/.test(ROUTE), "enum sets defined");
  assert.ok(/oneOf\(raw\.workStyle, WORK_STYLES/.test(ROUTE), "enum values validated");
  assert.ok(/const CAP = \{/.test(ROUTE) && /resumeText: 12000/.test(ROUTE), "free-text + résumé caps");
});

// ── ERRORS ──────────────────────────────────────────────────────────────────
test("friendly 429 and no raw internal error leakage from the route", () => {
  assert.ok(/status: 429/.test(ROUTE), "friendly 429");
  assert.ok(!/error:\s*(m|msg)\b/.test(ROUTE) && !/error:\s*err\.message/.test(ROUTE), "never returns the raw provider error");
});

test("Save never leaks a raw Supabase error", () => {
  assert.ok(/Couldn't save your roadmap/.test(SAVE), "generic save error");
  assert.ok(!/dbError\.message/.test(SAVE), "no raw Supabase error surfaced");
});

test("failed generation preserves the existing roadmap + progress (no pre-wipe)", () => {
  // handleGenerate must NOT clear the roadmap before a successful response.
  assert.ok(!/setAiPhases\(\[\]\)/.test(GEN), "no pre-fetch wipe of the roadmap");
  assert.ok(!/clearStorage\(\)/.test(GEN), "no pre-fetch clear of saved progress");
  assert.ok(/Couldn't generate your roadmap[\s\S]*return;/.test(GEN), "failure returns early, leaving state intact");
});

// ── PROGRESS / DESTRUCTIVE CONFIRM ──────────────────────────────────────────
test("progress is derived from actual checked tasks (no fake progress)", () => {
  assert.ok(/Math\.round\(\(completedTasks \/ totalTasks\) \* 100\)/.test(CLIENT), "deterministic progress %");
  assert.ok(/const completedTasks = checkedTasks\.size/.test(CLIENT), "derived from checked tasks");
});

test("destructive regenerate / edit-goals require explicit confirmation", () => {
  assert.ok(/const \[pendingDiscard, setPendingDiscard\]/.test(CLIENT), "confirm state exists");
  assert.ok(/const requestRegenerate = \(\) => \{[\s\S]*setPendingDiscard\("regen"\)/.test(CLIENT), "regenerate is gated");
  assert.ok(/const requestEditGoals = \(\) => \{[\s\S]*setPendingDiscard\("edit"\)/.test(CLIENT), "edit goals is gated");
  assert.ok(/onClick=\{requestRegenerate\}/.test(CLIENT) && /onClick=\{requestEditGoals\}/.test(CLIENT), "buttons use the gated handlers");
});

// ── SAMPLE / DEAD CONTENT ────────────────────────────────────────────────────
test("live client imports no dead/sample Career Path content", () => {
  for (const dead of ["SkillsAnalysis", "AIRecommendations", "RoadmapPreview", "CareerRoadmap", "CareerPathActions", "ROADMAP_PHASES"]) {
    assert.ok(!CLIENT.includes(dead), `live client must not reference dead/sample surface: ${dead}`);
  }
});

// ── PERSISTENCE (production schema verified) ────────────────────────────────────
const PAGE   = read("../src/app/career-path/page.tsx");
const DASH   = read("../src/app/components/dashboard/DashboardClient.tsx");
const WIDGET = read("../src/app/components/dashboard/RoadmapWidget.tsx");

const REOPEN = CLIENT.slice(CLIENT.indexOf("// ── Reopen a saved roadmap"), CLIENT.indexOf("const handleResumeParsed"));
const SAVEFN = CLIENT.slice(CLIENT.indexOf("const handleSave = async"), CLIENT.indexOf("// ── Progress"));
const DELFN  = CLIENT.slice(CLIENT.indexOf("const handleDeleteSaved"), CLIENT.indexOf("const handleSave = async"));

test("page passes ?id= through to the client for reopen", () => {
  assert.ok(/searchParams: Promise<\{ id\?: string \}>/.test(PAGE), "reads the id search param");
  assert.ok(/initialPathId=\{id\}/.test(PAGE), "passes it to the client");
});

test("save is explicit, inserts once then updates the same owner-scoped row", () => {
  assert.ok(/if \(careerPathId\) \{[\s\S]*\.update\(payload\)\.eq\("id", careerPathId\)\.eq\("user_id", session\.user\.id\)/.test(SAVEFN), "existing roadmap → owner-scoped update");
  assert.ok(/\.insert\(payload\)\.select\("id"\)\.single\(\)/.test(SAVEFN) && /setCareerPathId\(/.test(SAVEFN), "new roadmap → insert once and capture id");
  // Generation never writes to the DB (no autosave).
  assert.ok(!/\.insert\(|\.update\(/.test(GEN), "generation never persists");
});

test("careerPathId is persisted locally so reload/reopen does not duplicate", () => {
  assert.ok(/careerPathId: string \| null/.test(CLIENT), "persisted state carries the row id");
  assert.ok(/saveToStorage\(\{[\s\S]*careerPathId[\s\S]*\}\)/.test(CLIENT), "stored together with the roadmap");
  assert.ok(/saveToStorage\(\{ phases: data\.phases, checkedTasks: \[\], goalData, careerPathId: null \}\)/.test(CLIENT), "a freshly generated roadmap is unbound (null) until saved");
});

test("reopen is owner-scoped, restores stored progress, and makes NO AI call", () => {
  assert.ok(/\.from\("career_paths"\)/.test(REOPEN), "reads the saved row");
  assert.ok(/\.eq\("id", initialPathId\)/.test(REOPEN) && /\.eq\("user_id", session\.user\.id\)/.test(REOPEN) && /\.single\(\)/.test(REOPEN), "owner-scoped single-row read");
  assert.ok(!/\/api\/career-path\/generate/.test(REOPEN), "no AI call when reopening");
  assert.ok(/setCheckedTasks\(new Set\(checks\)\)/.test(REOPEN), "restores stored checked-task progress");
});

test("reopen degrades safely for old rows with no stored phases (no reconstruction)", () => {
  assert.ok(/if \(phases\.length === 0\)/.test(REOPEN) && /no stored steps/.test(REOPEN), "old/empty rows show a truthful notice, not invented content");
});

test("delete is owner-scoped and confirmed, and clears local state", () => {
  assert.ok(/\.delete\(\)\s*\n\s*\.eq\("id", careerPathId\)\s*\n\s*\.eq\("user_id", session\.user\.id\)/.test(DELFN), "owner-scoped delete");
  assert.ok(/clearStorage\(\)/.test(DELFN), "clears local roadmap on delete");
  assert.ok(/confirmDelete/.test(CLIENT) && /Delete permanently/.test(CLIENT), "delete requires an explicit confirm");
});

// ── DASHBOARD ───────────────────────────────────────────────────────────────────
test("dashboard lists saved roadmaps with View/Edit and owner-scoped Delete", () => {
  assert.ok(/\.from\("career_paths"\)\s*\n\s*\.delete\(\)\s*\n\s*\.eq\("id", id\)\s*\n\s*\.eq\("user_id", session\.user\.id\)/.test(DASH), "dashboard delete is owner-scoped");
  assert.ok(/\/career-path\?id=\$\{cp\.id\}/.test(WIDGET), "View/Edit targets the saved row id");
  assert.ok(/View \/ Edit/.test(WIDGET), "exposes a View/Edit action");
  assert.ok(/careerPaths\.slice\(0, 6\)\.map/.test(WIDGET), "saved roadmaps are discoverable (listed)");
});

test("dashboard roadmap widget shows no sample/mock content", () => {
  for (const banned of ["Motion Design", "Vercel", "Lead Designer", "70%", "ROADMAP_PHASES"]) {
    assert.ok(!WIDGET.includes(banned), `widget must not contain sample content: ${banned}`);
  }
});
