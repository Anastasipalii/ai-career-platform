// Pure-logic tests for the admin Monitoring Dashboard. No network, no Supabase,
// no DOM. Covers the stats/filter helpers and asserts the monitoring code path
// reads only the two workflow tables and never touches generation/providers.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/monitoringDashboard.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_FILTERS, filterRuns, computeRunStats, distinctValues, formatDuration, runTimestamp,
  type RunFilters,
} from "@/lib/monitoring/stats";
import type { WorkflowRunRow } from "@/lib/workflowRun";

// ── row factory ───────────────────────────────────────────────────────────────
let seq = 0;
const run = (o: Partial<WorkflowRunRow> = {}): WorkflowRunRow =>
  ({
    resume_name: null, resume_preview: null, analysis: null, ats_score: null,
    cover_letter: null, job_match: null, interview: null, source: null,
    completed_at: "2026-07-14T10:00:00.000Z",
    id: `id-${seq++}`, status: "completed", mode: "production", is_simulation: false,
    current_step: "completed", progress: 100, profession: "Frontend Developer",
    resume_language: "English", duration_ms: 1000, jobs_found: 3, retry_count: 0,
    created_at: "2026-07-14T10:00:00.000Z", started_at: "2026-07-14T09:59:59.000Z",
    ...o,
  }) as WorkflowRunRow;

const withFilters = (o: Partial<RunFilters>): RunFilters => ({ ...DEFAULT_FILTERS, ...o });

// ── stats ─────────────────────────────────────────────────────────────────────
test("computeRunStats tallies each status and totals", () => {
  const rows = [
    run({ status: "completed", duration_ms: 1000 }),
    run({ status: "completed", duration_ms: 3000 }),
    run({ status: "failed" }),
    run({ status: "running" }),
    run({ status: "queued" }),
    run({ status: "cancelled" }),
  ];
  const s = computeRunStats(rows);
  assert.equal(s.total, 6);
  assert.equal(s.completed, 2);
  assert.equal(s.failed, 1);
  assert.equal(s.running, 1);
  assert.equal(s.queued, 1);
  assert.equal(s.cancelled, 1);
  assert.equal(s.activeWorkers, 1); // == running
});

test("success rate = completed / terminal (ignores running+queued)", () => {
  const rows = [
    run({ status: "completed" }), run({ status: "completed" }), run({ status: "completed" }),
    run({ status: "failed" }),
    run({ status: "running" }), run({ status: "queued" }),
  ];
  // terminal = 3 completed + 1 failed = 4 → 75%
  assert.equal(computeRunStats(rows).successRatePct, 75);
});

test("success rate is 0 when there are no terminal runs", () => {
  assert.equal(computeRunStats([run({ status: "running" }), run({ status: "queued" })]).successRatePct, 0);
});

test("average duration only averages completed runs that have a duration", () => {
  const rows = [
    run({ status: "completed", duration_ms: 1000 }),
    run({ status: "completed", duration_ms: 3000 }),
    run({ status: "completed", duration_ms: null }), // ignored
    run({ status: "failed", duration_ms: 9999 }), // ignored (not completed)
  ];
  assert.equal(computeRunStats(rows).avgDurationMs, 2000);
});

test("runs-per-minute counts only rows created in the last 60s", () => {
  const now = Date.parse("2026-07-14T12:00:00.000Z");
  const rows = [
    run({ created_at: "2026-07-14T11:59:30.000Z" }), // 30s ago ✓
    run({ created_at: "2026-07-14T11:59:05.000Z" }), // 55s ago ✓
    run({ created_at: "2026-07-14T11:58:00.000Z" }), // 120s ago ✗
  ];
  assert.equal(computeRunStats(rows, { now }).runsPerMinute, 2);
});

// ── filters ─────────────────────────────────────────────────────────────────
test("status filter", () => {
  const rows = [run({ status: "completed" }), run({ status: "failed" })];
  assert.equal(filterRuns(rows, withFilters({ status: "failed" })).length, 1);
  assert.equal(filterRuns(rows, withFilters({ status: "all" })).length, 2);
});

test("simulation vs production filter", () => {
  const rows = [run({ is_simulation: true }), run({ is_simulation: false }), run({ is_simulation: false })];
  assert.equal(filterRuns(rows, withFilters({ simulation: "simulation" })).length, 1);
  assert.equal(filterRuns(rows, withFilters({ simulation: "production" })).length, 2);
  assert.equal(filterRuns(rows, withFilters({ simulation: "all" })).length, 3);
});

test("profession and resume-language filters (exact match)", () => {
  const rows = [
    run({ profession: "Lawyer", resume_language: "German" }),
    run({ profession: "Frontend Developer", resume_language: "English" }),
  ];
  assert.equal(filterRuns(rows, withFilters({ profession: "Lawyer" })).length, 1);
  assert.equal(filterRuns(rows, withFilters({ resumeLanguage: "English" })).length, 1);
});

test("date-range filter is inclusive by created_at day", () => {
  const rows = [
    run({ created_at: "2026-07-10T08:00:00.000Z" }),
    run({ created_at: "2026-07-14T08:00:00.000Z" }),
    run({ created_at: "2026-07-20T08:00:00.000Z" }),
  ];
  const r = filterRuns(rows, withFilters({ fromDate: "2026-07-12", toDate: "2026-07-14" }));
  assert.equal(r.length, 1);
  assert.equal(filterRuns(rows, withFilters({ fromDate: "2026-07-10" })).length, 3);
  assert.equal(filterRuns(rows, withFilters({ toDate: "2026-07-14" })).length, 2);
});

test("filters compose (status + simulation + profession)", () => {
  const rows = [
    run({ status: "failed", is_simulation: true, profession: "Lawyer" }),
    run({ status: "failed", is_simulation: true, profession: "Nurse" }),
    run({ status: "completed", is_simulation: true, profession: "Lawyer" }),
  ];
  const r = filterRuns(rows, withFilters({ status: "failed", simulation: "simulation", profession: "Lawyer" }));
  assert.equal(r.length, 1);
});

test("distinctValues returns sorted, de-duped, non-empty values", () => {
  const rows = [
    run({ profession: "Nurse" }), run({ profession: "Lawyer" }),
    run({ profession: "Nurse" }), run({ profession: "" }),
  ];
  assert.deepEqual(distinctValues(rows, "profession"), ["Lawyer", "Nurse"]);
});

test("runTimestamp falls back created → started → completed", () => {
  assert.equal(runTimestamp(run({ created_at: "A", started_at: "B", completed_at: "C" })), "A");
  assert.equal(
    runTimestamp(run({ created_at: undefined, started_at: "B", completed_at: "C" }) as WorkflowRunRow),
    "B"
  );
});

test("formatDuration is human-friendly and safe", () => {
  assert.equal(formatDuration(null), "—");
  assert.equal(formatDuration(-5), "—");
  assert.equal(formatDuration(250), "250ms");
  assert.equal(formatDuration(2500), "2.5s");
  assert.equal(formatDuration(90000), "1m 30s");
});

// ── read path is monitoring-only (no generation/provider/PII) ─────────────────
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");
const readCode = (rel: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

test("monitoring stats module makes no external / generation calls", () => {
  const code = readCode("../src/lib/monitoring/stats.ts");
  assert.ok(!/openai/i.test(code));
  assert.ok(!/arbeitnow|jobs\/providers/i.test(code));
  assert.ok(!/\bfetch\s*\(/.test(code));
  assert.ok(!/supabase/i.test(code), "stats must stay pure (no Supabase import)");
});

test("admin readers query only workflow_runs and workflow_events", () => {
  const code = readCode("../src/lib/workflowRun.ts");
  // isolate the two admin readers
  const start = code.indexOf("readAllWorkflowRunsAdmin");
  const region = code.slice(start);
  const tables = [...region.matchAll(/\.from\((["'])([a-z_]+)\1\)/g)].map((m) => m[2]);
  for (const t of tables) assert.ok(["workflow_runs", "workflow_events"].includes(t), `unexpected table ${t}`);
  // the events reader must not select résumé / cover-letter / interview / metadata text
  assert.ok(!/select\([^)]*metadata/i.test(region), "event reader must not select metadata blob");
  assert.ok(!/resume_preview|cover_letter|interview|analysis/i.test(region), "no PII/content columns in admin reads");
});

test("MonitoringClient imports no generation/provider APIs", () => {
  const code = readCode("../src/app/components/admin/MonitoringClient.tsx");
  assert.ok(!/openai/i.test(code));
  assert.ok(!/arbeitnow|jobs\/providers/i.test(code));
  assert.ok(!/api\/(cover-letter|interview|resume|job-match|jobs)/i.test(code));
  // reads go through the repository layer, not ad-hoc supabase queries in the UI
  assert.ok(!/\.from\(/.test(code), "UI must not query supabase directly");
});
