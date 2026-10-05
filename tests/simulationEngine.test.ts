// Pure-logic tests for the controlled load-test engine. No network, no
// Supabase, no OpenAI, no provider, no timers of consequence (sleep is a no-op).
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/simulationEngine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runSimulationBatch,
  failingIndexSet,
  type SimulationSink,
  type SimStageRef,
} from "@/lib/simulation/engine";
import { normalizeSimulationConfig } from "@/lib/simulation/config";
import { WORKFLOW_STAGES } from "@/lib/workflow/stages";

// ── in-memory sink that records everything the engine does ────────────────────
interface Recorded {
  runs: Map<string, { runId: string; status: string; stages: string[]; events: string[]; concurrentPeak: number }>;
  createdOrder: string[];
  maxConcurrent: number;
  current: number;
}

function memorySink(rec: Recorded): SimulationSink {
  let idSeq = 0;
  const touch = (runKey: string, runId?: string) => {
    if (!rec.runs.has(runKey))
      rec.runs.set(runKey, { runId: runId ?? "", status: "queued", stages: [], events: [], concurrentPeak: 0 });
    return rec.runs.get(runKey)!;
  };
  return {
    async createRun({ runKey }) {
      const runId = `run-${idSeq++}`;
      touch(runKey, runId).runId = runId;
      rec.createdOrder.push(runKey);
      rec.current++;
      rec.maxConcurrent = Math.max(rec.maxConcurrent, rec.current);
      return { runId };
    },
    async markRunning({ runKey }) {
      touch(runKey).status = "running";
    },
    async startStage({ runKey, stage }) {
      const r = touch(runKey);
      r.stages.push(stage);
      r.events.push(`start:${stage}`);
    },
    async completeStage({ runKey, stage }) {
      touch(runKey).events.push(`done:${stage}`);
    },
    async failStage({ runKey, stage }) {
      touch(runKey).events.push(`fail:${stage}`);
    },
    async completeRun({ runKey }) {
      touch(runKey).status = "completed";
      rec.current--;
    },
    async failRun({ runKey }) {
      touch(runKey).status = "failed";
      rec.current--;
    },
    async cancelRun({ runKey }) {
      touch(runKey).status = "cancelled";
      rec.current--;
    },
  };
}

const fresh = (): Recorded => ({ runs: new Map(), createdOrder: [], maxConcurrent: 0, current: 0 });
const noSleep = () => Promise.resolve();
let uuidSeq = 0;
const seqUuid = () => `uuid-${uuidSeq++}`;

// ── failing index selection ───────────────────────────────────────────────────
test("failingIndexSet yields an exact, deterministic count", () => {
  assert.equal(failingIndexSet(100, 0).size, 0);
  assert.equal(failingIndexSet(100, 5).size, 5);
  assert.equal(failingIndexSet(100, 10).size, 10);
  assert.equal(failingIndexSet(100, 20).size, 20);
  // reproducible: same inputs → same indices
  assert.deepEqual([...failingIndexSet(50, 10)], [...failingIndexSet(50, 10)]);
});

// ── happy path ────────────────────────────────────────────────────────────────
test("batch completes all runs at 0% failure", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 10, concurrency: 3, failureRatePct: 0 });
  const summary = await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  assert.equal(summary.total, 10);
  assert.equal(summary.completed, 10);
  assert.equal(summary.failed, 0);
  assert.equal(summary.cancelled, 0);
  assert.equal(summary.results.length, 10);
});

// ── deterministic failure injection ───────────────────────────────────────────
test("failure rate produces the exact number of failed runs", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 50, concurrency: 5, failureRatePct: 20 });
  const summary = await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  assert.equal(summary.failed, 10); // 20% of 50
  assert.equal(summary.completed, 40);
  assert.equal(summary.completed + summary.failed, 50);
});

test("same seed ⇒ identical outcomes (reproducible)", async () => {
  const run = async () => {
    uuidSeq = 0;
    const { config } = normalizeSimulationConfig({ totalRuns: 25, concurrency: 4, failureRatePct: 10, seed: 7 });
    return runSimulationBatch({ config, sink: memorySink(fresh()), sleep: noSleep, uuid: seqUuid });
  };
  const a = await run();
  const b = await run();
  assert.deepEqual(
    a.results.map((r) => `${r.index}:${r.outcome}:${r.failedStage ?? ""}`),
    b.results.map((r) => `${r.index}:${r.outcome}:${r.failedStage ?? ""}`)
  );
});

// ── concurrency bound (the anti-Promise.all guarantee) ────────────────────────
test("never exceeds the configured concurrency", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 100, concurrency: 5, failureRatePct: 10 });
  const summary = await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  assert.ok(rec.maxConcurrent <= 5, `max concurrent ${rec.maxConcurrent} must be ≤ 5`);
  assert.equal(summary.total, 100);
});

// ── run isolation ─────────────────────────────────────────────────────────────
test("every run has a unique run_key and synthetic user id (no shared state)", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 100, concurrency: 8 });
  const summary = await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  assert.equal(new Set(summary.results.map((r) => r.runKey)).size, 100);
  assert.equal(new Set(summary.results.map((r) => r.simulationUserId)).size, 100);
  assert.equal(rec.runs.size, 100);
});

// ── event timeline ordering ───────────────────────────────────────────────────
test("stage events are ordered and terminate correctly", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 4, concurrency: 1, failureRatePct: 0 });
  await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  for (const [, r] of rec.runs) {
    assert.equal(r.status, "completed");
    // every started stage is a canonical stage, in the fixed working order
    for (const s of r.stages) assert.ok(WORKFLOW_STAGES.includes(s as never));
    assert.equal(r.stages[0], "resume_uploaded");
    assert.equal(r.stages.at(-1), "persistence");
    // each stage has both a start and a done event (no fails at 0%)
    assert.equal(r.events.filter((e) => e.startsWith("start:")).length, r.stages.length);
    assert.equal(r.events.filter((e) => e.startsWith("done:")).length, r.stages.length);
  }
});

test("a failed run stops at its failing stage and records a fail event", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const { config } = normalizeSimulationConfig({ totalRuns: 10, concurrency: 2, failureRatePct: 10, seed: 3 });
  const summary = await runSimulationBatch({ config, sink: memorySink(rec), sleep: noSleep, uuid: seqUuid });
  const failed = summary.results.find((r) => r.outcome === "failed");
  assert.ok(failed, "expected at least one failed run");
  assert.ok(failed!.failedStage, "failed run must record the failing stage");
  // the run row is marked failed and a fail event exists
  const row = [...rec.runs.values()].find((r) => r.status === "failed");
  assert.ok(row);
  assert.ok(row!.events.some((e) => e.startsWith("fail:")));
});

// ── cancellation (fifth status) ───────────────────────────────────────────────
test("aborting the batch cancels in-flight and prevents new runs", async () => {
  uuidSeq = 0;
  const rec = fresh();
  const ac = new AbortController();
  const { config } = normalizeSimulationConfig({ totalRuns: 50, concurrency: 3, failureRatePct: 0 });
  // Abort almost immediately; a real (tiny) delay lets a few runs start first.
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 2)));
  const p = runSimulationBatch({ config, sink: memorySink(rec), sleep, uuid: seqUuid, signal: ac.signal });
  setTimeout(() => ac.abort(), 5);
  const summary = await p;
  assert.equal(summary.completed + summary.failed + summary.cancelled, summary.results.length);
  assert.ok(summary.cancelled > 0 || summary.results.length < 50, "abort must cancel or stop starting runs");
  // no run is left in a non-terminal state
  for (const [, r] of rec.runs) assert.ok(["completed", "failed", "cancelled"].includes(r.status));
});

// ── config normalization ──────────────────────────────────────────────────────
test("config normalizer clamps and snaps untrusted input", () => {
  const { config, notes } = normalizeSimulationConfig({
    totalRuns: 77, concurrency: 999, failureRatePct: 13, minStageDelayMs: 500, maxStageDelayMs: 100,
  });
  assert.ok([10, 25, 50, 100, 250, 500].includes(config.totalRuns));
  assert.ok(config.concurrency <= 20 && config.concurrency >= 1);
  assert.ok([0, 5, 10, 20].includes(config.failureRatePct));
  assert.ok(config.minStageDelayMs <= config.maxStageDelayMs); // swapped
  assert.ok(notes.length > 0);
});

test("defaults are total=100, concurrency=5, failure=0", () => {
  const { config } = normalizeSimulationConfig();
  assert.equal(config.totalRuns, 100);
  assert.equal(config.concurrency, 5);
  assert.equal(config.failureRatePct, 0);
});

// keep the SimStageRef type referenced so the import is meaningful to readers
const _typecheck: SimStageRef | null = null;
void _typecheck;
