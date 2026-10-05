// Pure-logic tests for the Part B/C monitoring + simulation foundation. No
// network, no Supabase, no OpenAI, no provider. Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/monitoring.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  WORKFLOW_STATUSES,
  WORKFLOW_STAGES,
  isValidStatusTransition,
  isTerminalStatus,
  isSimulationMode,
  clampProgress,
  sanitizeEventMetadata,
  type WorkflowStatus,
} from "@/lib/workflow/stages";
import {
  SIMULATION_PROFILES,
  SIMULATION_STAGE_SEQUENCE,
  simulationProfileForIndex,
} from "@/lib/simulation/profiles";

// ── status state machine ──────────────────────────────────────────────────────
test("valid status transitions: queued may start, cancel or fail", () => {
  assert.equal(isValidStatusTransition("queued", "running"), true);
  assert.equal(isValidStatusTransition("queued", "cancelled"), true);
  assert.equal(isValidStatusTransition("queued", "failed"), true);
  // queued cannot jump straight to completed
  assert.equal(isValidStatusTransition("queued", "completed"), false);
});

test("valid status transitions: running may complete, fail or cancel", () => {
  assert.equal(isValidStatusTransition("running", "completed"), true);
  assert.equal(isValidStatusTransition("running", "failed"), true);
  assert.equal(isValidStatusTransition("running", "cancelled"), true);
});

test("terminal statuses are frozen (no outgoing transitions)", () => {
  for (const t of ["completed", "failed", "cancelled"] as WorkflowStatus[]) {
    assert.equal(isTerminalStatus(t), true);
    for (const to of WORKFLOW_STATUSES) {
      if (to === t) continue; // same-state is idempotent
      assert.equal(isValidStatusTransition(t, to), false, `${t} -> ${to} must be blocked`);
    }
  }
});

test("same-state transition is idempotent (true)", () => {
  for (const s of WORKFLOW_STATUSES) {
    assert.equal(isValidStatusTransition(s, s), true);
  }
});

test("cancellation is only valid from non-terminal states", () => {
  assert.equal(isValidStatusTransition("running", "cancelled"), true);
  assert.equal(isValidStatusTransition("queued", "cancelled"), true);
  assert.equal(isValidStatusTransition("completed", "cancelled"), false);
  assert.equal(isValidStatusTransition("failed", "cancelled"), false);
});

// ── progress bounds ────────────────────────────────────────────────────────────
test("progress clamps to the 0..100 integer range", () => {
  assert.equal(clampProgress(-10), 0);
  assert.equal(clampProgress(0), 0);
  assert.equal(clampProgress(37.6), 38);
  assert.equal(clampProgress(100), 100);
  assert.equal(clampProgress(1000), 100);
  assert.equal(clampProgress(undefined), 0);
  assert.equal(clampProgress(null), 0);
  assert.equal(clampProgress(NaN), 0);
});

// ── simulation flag preservation ───────────────────────────────────────────────
test("simulation flag mirrors non-production mode", () => {
  assert.equal(isSimulationMode("production"), false);
  assert.equal(isSimulationMode("stress"), true);
  assert.equal(isSimulationMode("demo"), true);
});

// ── run isolation ──────────────────────────────────────────────────────────────
test("simulationProfileForIndex is deterministic and round-robins", () => {
  const n = SIMULATION_PROFILES.length;
  assert.equal(simulationProfileForIndex(0).key, simulationProfileForIndex(n).key);
  assert.equal(simulationProfileForIndex(1).key, simulationProfileForIndex(n + 1).key);
  // negative indices are handled without throwing / undefined
  assert.ok(simulationProfileForIndex(-1).key);
});

test("100 simulated runs get isolated synthetic identities (no shared id)", () => {
  const ids = Array.from({ length: 100 }, (_, i) => `sim-user-${i}-${simulationProfileForIndex(i).key}`);
  assert.equal(new Set(ids).size, 100, "every simulated run must have a unique synthetic id");
});

test("simulation profile keys are unique", () => {
  const keys = SIMULATION_PROFILES.map((p) => p.key);
  assert.equal(new Set(keys).size, keys.length);
});

// ── event timeline ordering ────────────────────────────────────────────────────
test("simulation stage sequence starts queued and ends completed", () => {
  assert.equal(SIMULATION_STAGE_SEQUENCE[0], "queued");
  assert.equal(SIMULATION_STAGE_SEQUENCE[SIMULATION_STAGE_SEQUENCE.length - 1], "completed");
});

test("every simulation stage is a canonical workflow stage", () => {
  for (const s of SIMULATION_STAGE_SEQUENCE) {
    assert.ok(WORKFLOW_STAGES.includes(s), `${s} must be a canonical stage`);
  }
});

test("events sort into a stable timeline by started_at", () => {
  const events = [
    { stage: "job_search", started_at: "2026-07-14T10:00:02Z" },
    { stage: "queued", started_at: "2026-07-14T10:00:00Z" },
    { stage: "resume_analysis", started_at: "2026-07-14T10:00:01Z" },
  ];
  const ordered = [...events].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  assert.deepEqual(ordered.map((e) => e.stage), ["queued", "resume_analysis", "job_search"]);
});

// ── catalog coverage ───────────────────────────────────────────────────────────
test("simulation catalog spans many domains and both EN + DE", () => {
  const domains = new Set(SIMULATION_PROFILES.map((p) => p.domain));
  // broad professional coverage requested (frontend, backend, legal, hospitality,
  // medical, accounting, design, marketing, sales, hr, ai-automation)
  assert.ok(domains.size >= 10, `expected >=10 domains, got ${domains.size}`);
  const langs = new Set(SIMULATION_PROFILES.map((p) => p.language));
  assert.ok(langs.has("English"));
  assert.ok(langs.has("German"));
});

test("a zero-result profile exists (covers the empty-results path)", () => {
  assert.ok(SIMULATION_PROFILES.some((p) => p.jobsFound === 0));
  assert.ok(SIMULATION_PROFILES.every((p) => p.jobsFound >= 0));
});

// ── metadata sanitizer: no résumé text / secrets / PII in the event log ─────────
test("sanitizeEventMetadata drops résumé, cover letter and interview text", () => {
  const out = sanitizeEventMetadata({
    resumeText: "John Doe, 10 years ...",
    cover_letter: "Dear hiring manager ...",
    interviewQuestions: ["Q1", "Q2"],
    jobsFound: 5,
  });
  assert.equal(out.resumeText, undefined);
  assert.equal(out.cover_letter, undefined);
  assert.equal(out.interviewQuestions, undefined);
  assert.equal(out.jobsFound, 5); // compact telemetry survives
});

test("sanitizeEventMetadata drops secrets and PII", () => {
  const out = sanitizeEventMetadata({
    apiKey: "sk-123",
    token: "abc",
    password: "hunter2",
    authorization: "Bearer x",
    email: "a@b.com",
    phone: "+1 555",
    address: "1 Main St",
    ssn: "000-00-0000",
    stage: "job_search",
    progress: 50,
  });
  for (const forbidden of ["apiKey", "token", "password", "authorization", "email", "phone", "address", "ssn"]) {
    assert.equal(out[forbidden], undefined, `${forbidden} must be stripped`);
  }
  assert.equal(out.stage, "job_search");
  assert.equal(out.progress, 50);
});

test("sanitizeEventMetadata drops large free-text blobs and nested objects", () => {
  const out = sanitizeEventMetadata({
    note: "x".repeat(500), // too long → dropped
    nested: { secret: "y" }, // objects dropped
    shortNote: "ok",
    count: 3,
    flag: true,
  });
  assert.equal(out.note, undefined);
  assert.equal(out.nested, undefined);
  assert.equal(out.shortNote, "ok");
  assert.equal(out.count, 3);
  assert.equal(out.flag, true);
});

// ── admin vs user data access, at the migration/policy-review level ─────────────
const migrationSql = readFileSync(
  fileURLToPath(new URL("../supabase/part_bc_monitoring.sql", import.meta.url)),
  "utf8",
).toLowerCase();

test("migration defines a trusted, security-definer admin check", () => {
  assert.ok(/create or replace function public\.is_admin\(\)/.test(migrationSql));
  assert.ok(migrationSql.includes("security definer"));
  // admin identity is keyed on auth.users via the app_admins allow-list
  assert.ok(migrationSql.includes("from public.app_admins where user_id = auth.uid()"));
});

test("admin gating does NOT hard-depend on an optional profiles table", () => {
  // no unguarded DDL/policy against profiles anywhere
  assert.ok(!/^\s*alter table public\.profiles/m.test(migrationSql));
  // any profiles interaction is guarded by an existence check
  assert.ok(migrationSql.includes("to_regclass('public.profiles')"));
});

test("admin allow-list is keyed on auth.users and not client-writable", () => {
  assert.ok(/create table if not exists public\.app_admins/.test(migrationSql));
  assert.ok(migrationSql.includes("references auth.users"));
  // read gated by is_admin; no insert/update/delete policy on the allow-list
  assert.ok(migrationSql.includes('"app_admins: admin select"'));
  assert.ok(!/app_admins.*for\s+(insert|update|delete)/.test(migrationSql));
});

test("migration grants admins read-all on runs and events", () => {
  assert.ok(migrationSql.includes('"workflow_runs: admin select all"'));
  assert.ok(migrationSql.includes('"workflow_events: admin select all"'));
  // admin read policies must be gated behind is_admin(), never client input
  assert.ok(migrationSql.includes("using (public.is_admin())"));
});

test("workflow_events stays append-only (no update/delete policy added)", () => {
  assert.ok(!/for\s+update/.test(migrationSql), "no UPDATE policy expected on events");
  assert.ok(!/for\s+delete/.test(migrationSql), "no DELETE policy expected on events");
});

test("is_simulation is a generated column, never client-set", () => {
  assert.ok(migrationSql.includes("generated always as (mode <> 'production') stored"));
});

test("migration is additive only (no drop table / drop column / rename)", () => {
  assert.ok(!/drop\s+table/.test(migrationSql));
  assert.ok(!/drop\s+column/.test(migrationSql));
  assert.ok(!/rename\s+column/.test(migrationSql));
});
