// Tests for the production stage timeline, duration correctness, the polling
// controller, and the monitoring layout/refresh guarantees. Pure logic — no
// network, no Supabase, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/productionTimeline.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  PRODUCTION_STAGES, StageTracker, planProductionStages, drivePlan, createMemoryRecorder,
} from "@/lib/workflow/productionStages";
import { PollingController } from "@/lib/monitoring/polling";
import {
  DEFAULT_FILTERS, filterRuns, computeRunStats, type RunFilters,
} from "@/lib/monitoring/stats";
import type { WorkflowRunRow } from "@/lib/workflowRun";

const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/([^:])\/\/.*$/gm, "$1");

// ── 1. chronological order + 2. every started stage has a terminal ────────────
test("production stages emit begin+terminal in chronological order", async () => {
  const { recorder, calls } = createMemoryRecorder();
  let t = 0;
  const tracker = new StageTracker(recorder, () => (t += 1));
  await drivePlan(tracker, planProductionStages());

  // memory recorder: strictly alternating begin/end for each stage in order
  const expected = PRODUCTION_STAGES.flatMap((s) => [`begin:${s}`, `end:${s}`]);
  assert.deepEqual(calls.map((c) => `${c.type}:${c.stage}`), expected);

  // tracker log timestamps are non-decreasing (chronological)
  for (let i = 1; i < tracker.log.length; i++) {
    assert.ok(tracker.log[i].atMs >= tracker.log[i - 1].atMs);
  }
  // every 'running' has a matching terminal for the same stage
  const running = tracker.log.filter((e) => e.status === "running");
  for (const r of running) {
    assert.ok(tracker.log.some((e) => e.stage === r.stage && (e.status === "completed" || e.status === "failed")));
  }
});

test("starting a new stage without ending the prior self-heals (no orphans)", async () => {
  const { recorder, calls } = createMemoryRecorder();
  const tracker = new StageTracker(recorder);
  await tracker.begin("resume_analysis");
  await tracker.begin("profile_created"); // should auto-close resume_analysis
  await tracker.end("profile_created");
  assert.deepEqual(
    calls.map((c) => `${c.type}:${c.stage}`),
    ["begin:resume_analysis", "end:resume_analysis", "begin:profile_created", "end:profile_created"]
  );
});

// ── 3. successful run ends with completed (plan covers all stages) ────────────
test("successful production plan walks all stages ending at persistence", () => {
  const plan = planProductionStages();
  assert.deepEqual(plan.map((p) => p.stage), [...PRODUCTION_STAGES]);
  assert.ok(plan.every((p) => p.status === "completed"));
  assert.equal(plan.at(-1)!.stage, "persistence");
  // the terminal "completed" run event is emitted by completeWorkflowRun, not here
  assert.ok(!PRODUCTION_STAGES.includes("completed" as never));
});

// ── 4. failed run ends at the failed stage ────────────────────────────────────
test("fatal production run stops at the failed stage", async () => {
  const plan = planProductionStages({ fatalStage: "cover_letter" });
  assert.equal(plan.at(-1)!.stage, "cover_letter");
  assert.equal(plan.at(-1)!.status, "failed");
  assert.ok(!plan.some((p) => p.stage === "interview_questions")); // never reached

  const { calls } = createMemoryRecorder();
  const rec = createMemoryRecorder();
  const tracker = new StageTracker(rec.recorder);
  await drivePlan(tracker, plan);
  assert.equal(rec.calls.at(-1)!.type, "fail");
  assert.equal(rec.calls.at(-1)!.stage, "cover_letter");
  void calls;
});

// ── 5. zero-job run still records Branch B stages ─────────────────────────────
test("zero-job run still records ats/cover/interview/persistence (Branch B)", async () => {
  // Branch B is unconditional in the plan — no job outcome removes it.
  const plan = planProductionStages(); // provider-unavailable / zero jobs is NOT fatal
  const stages = new Set(plan.map((p) => p.stage));
  for (const s of ["ats_analysis", "cover_letter", "interview_questions", "persistence"] as const) {
    assert.ok(stages.has(s), `Branch B stage ${s} must still run`);
  }
});

// ── 6. production duration is positive for a real completed stage/run ─────────
test("stage duration is positive when real time elapses", async () => {
  let t = 1000;
  const tracker = new StageTracker(null, () => t);
  await tracker.begin("job_search");
  t += 42; // 42ms of real work
  await tracker.end("job_search");
  const done = tracker.log.find((e) => e.stage === "job_search" && e.status === "completed");
  assert.ok(done && done.durationMs! > 0);
  assert.equal(done!.durationMs, 42);
});

// ── 7. average duration ignores null and zero values ──────────────────────────
let seq = 0;
const run = (o: Partial<WorkflowRunRow> = {}): WorkflowRunRow =>
  ({
    resume_name: null, resume_preview: null, analysis: null, ats_score: null,
    cover_letter: null, job_match: null, interview: null, source: null,
    completed_at: "2026-07-14T10:00:00.000Z", id: `id-${seq++}`, status: "completed",
    mode: "production", is_simulation: false, current_step: "completed", progress: 100,
    profession: "Nurse", resume_language: "English", duration_ms: 1000, jobs_found: 0,
    retry_count: 0, created_at: "2026-07-14T10:00:00.000Z", started_at: "2026-07-14T09:59:59.000Z",
    ...o,
  }) as WorkflowRunRow;

test("average duration ignores null and zero, and reports sample count", () => {
  const rows = [
    run({ status: "completed", duration_ms: 2000 }),
    run({ status: "completed", duration_ms: 4000 }),
    run({ status: "completed", duration_ms: null }),
    run({ status: "completed", duration_ms: 0 }),
    run({ status: "failed", duration_ms: 9999 }),
  ];
  const s = computeRunStats(rows);
  assert.equal(s.avgDurationMs, 3000);
  assert.equal(s.avgDurationSampleCount, 2);
});

test("no valid durations → sample count 0 (UI shows a dash, not 0ms)", () => {
  const rows = [run({ status: "completed", duration_ms: null }), run({ status: "running", duration_ms: null })];
  const s = computeRunStats(rows);
  assert.equal(s.avgDurationSampleCount, 0);
  assert.equal(s.avgDurationMs, 0); // guarded by sample count in the UI
});

// ── 8. Date Range container uses responsive non-overflowing classes ───────────
test("MonitoringClient date-range uses responsive, non-overflowing layout", () => {
  const src = readCode("../src/app/components/admin/MonitoringClient.tsx");
  const i = src.indexOf('Date range');
  assert.ok(i >= 0);
  const block = src.slice(i, i + 600);
  assert.ok(/flex\s+flex-wrap/.test(block), "date range row should flex-wrap");
  assert.ok(/min-w-0/.test(block), "date range row/inputs need min-w-0");
  assert.ok(/flex-1 min-w-0/.test(block), "date inputs must be flex-1 min-w-0");
});

// ── 9. Refresh preserves filters and reloads data ─────────────────────────────
test("filtering does not mutate the filters object; new data reloads results", () => {
  const filters: RunFilters = { ...DEFAULT_FILTERS, status: "completed" };
  const snapshot = JSON.stringify(filters);
  const before = [run({ status: "completed" }), run({ status: "failed" })];
  const after = [run({ status: "completed" }), run({ status: "completed" }), run({ status: "failed" })];
  assert.equal(filterRuns(before, filters).length, 1);
  assert.equal(filterRuns(after, filters).length, 2); // "refresh" loaded more → recomputed
  assert.equal(JSON.stringify(filters), snapshot); // filters preserved (unchanged)
});

// ── 10. Auto-refresh: one interval, cleaned up ────────────────────────────────
test("PollingController creates exactly one interval and clears it", () => {
  let created = 0;
  let cleared = 0;
  let ticks = 0;
  const fakeIds: number[] = [];
  const controller = new PollingController(5000, () => { ticks++; }, {
    setInterval: (fn) => { created++; fakeIds.push(created); void fn; return created as unknown as ReturnType<typeof setInterval>; },
    clearInterval: () => { cleared++; },
  });
  controller.start();
  controller.start(); // must NOT create a second timer
  controller.start();
  assert.equal(created, 1);
  assert.ok(controller.isRunning());
  controller.stop();
  assert.equal(cleared, 1);
  assert.ok(!controller.isRunning());
  controller.start(); // can restart
  assert.equal(created, 2);
  controller.stop();
  void ticks;
});

// ── 11. Simulation behaviour unchanged (no coupling to production lifecycle) ──
test("simulation engine does not import the production stage/lifecycle code", () => {
  const engine = readCode("../src/lib/simulation/engine.ts");
  assert.ok(!/productionStages/.test(engine));
  assert.ok(!/createWorkflowRun|completeWorkflowRun|failWorkflowRun/.test(engine));
  // engine still owns its bounded worker pool + deterministic failure logic
  assert.ok(/failingIndexSet/.test(engine));
});

test("production stage instrumentation logs no résumé/cover/interview text or metadata", () => {
  const canvas = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  // the stage-event calls carry only { runId, stage, mode, startedAt } — never text
  const stageCalls = canvas.match(/(startStageEvent|completeStageEvent|failStageEvent)\([^;]*?\)/g) ?? [];
  assert.ok(stageCalls.length > 0, "expected stage-event calls in the production path");
  for (const c of stageCalls) {
    assert.ok(!/resumeText|resume_preview|coverLetter|cover_letter|interview|metadata\s*:/i.test(c), `stage call leaks content: ${c}`);
  }
});
