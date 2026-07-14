// Tests for the admin gate + batch controller that sit between the simulation
// engine and the admin UI. Pure logic — no network, no Supabase, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/simulationBatch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resolveAdminAccess } from "@/lib/simulation/adminAccess";
import { SimulationBatchController } from "@/lib/simulation/batchController";
import type { SimulationSink } from "@/lib/simulation/engine";

// ── a memory sink that records what the engine did ────────────────────────────
interface Rec {
  creates: number;
  runKeys: string[];
  simUserIds: string[];
  maxConcurrent: number;
  current: number;
  statuses: Map<string, string>;
}
const freshRec = (): Rec => ({
  creates: 0,
  runKeys: [],
  simUserIds: [],
  maxConcurrent: 0,
  current: 0,
  statuses: new Map(),
});

function memorySink(rec: Rec, opts: { failCreateAt?: number } = {}): SimulationSink {
  let id = 0;
  let createIdx = 0;
  return {
    async createRun({ runKey, simulationUserId }) {
      if (opts.failCreateAt === createIdx++) throw new Error("simulated persistence failure");
      rec.creates++;
      rec.runKeys.push(runKey);
      rec.simUserIds.push(simulationUserId);
      rec.current++;
      rec.maxConcurrent = Math.max(rec.maxConcurrent, rec.current);
      rec.statuses.set(runKey, "queued");
      return { runId: `run-${id++}` };
    },
    async markRunning({ runKey }) {
      rec.statuses.set(runKey, "running");
    },
    async startStage() {},
    async completeStage() {},
    async failStage() {},
    async completeRun({ runKey }) {
      rec.statuses.set(runKey, "completed");
      rec.current--;
    },
    async failRun({ runKey }) {
      rec.statuses.set(runKey, "failed");
      rec.current--;
    },
    async cancelRun({ runKey }) {
      rec.statuses.set(runKey, "cancelled");
      rec.current--;
    },
  };
}

const noSleep = () => Promise.resolve();
let uuidSeq = 0;
const seqUuid = () => `uuid-${uuidSeq++}`;
const makeController = (rec: Rec, sinkOpts?: { failCreateAt?: number }) =>
  new SimulationBatchController({
    makeSink: () => memorySink(rec, sinkOpts),
    engine: { sleep: noSleep, uuid: seqUuid },
  });

// ── admin gate ────────────────────────────────────────────────────────────────
test("admin access ALLOWED when app_admins confirms the user", async () => {
  const a = await resolveAdminAccess({
    getUserId: async () => "user-1",
    isUserAdmin: async () => true,
  });
  assert.deepEqual(a, { userId: "user-1", isAdmin: true });
});

test("admin access DENIED for a non-admin (fails closed)", async () => {
  const a = await resolveAdminAccess({
    getUserId: async () => "user-2",
    isUserAdmin: async () => false,
  });
  assert.equal(a.isAdmin, false);
});

test("admin access DENIED when there is no session", async () => {
  const a = await resolveAdminAccess({
    getUserId: async () => null,
    isUserAdmin: async () => true, // must not even be consulted
  });
  assert.deepEqual(a, { userId: null, isAdmin: false });
});

test("admin access DENIED when the check throws (fail closed)", async () => {
  const a = await resolveAdminAccess({
    getUserId: async () => "user-3",
    isUserAdmin: async () => {
      throw new Error("network");
    },
  });
  assert.equal(a.isAdmin, false);
});

// ── controller: config defaults & clamping ────────────────────────────────────
test("controller uses correct default configuration", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  await c.start(); // no input → defaults
  const p = c.getProgress();
  assert.equal(p.config!.totalRuns, 100);
  assert.equal(p.config!.concurrency, 5);
  assert.equal(p.config!.failureRatePct, 0);
  assert.equal(p.total, 100);
});

test("controller clamps/snaps invalid config", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  await c.start({ totalRuns: 999, concurrency: 50, failureRatePct: 7 });
  const p = c.getProgress();
  assert.ok([10, 25, 50, 100, 250, 500].includes(p.config!.totalRuns));
  assert.ok(p.config!.concurrency <= 20);
  assert.ok([0, 5, 10, 20].includes(p.config!.failureRatePct));
  assert.ok(p.notes.length > 0);
});

// ── controller: run count, concurrency, failures, isolation ───────────────────
test("runs exactly the requested count", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const summary = await c.start({ totalRuns: 25, concurrency: 4, failureRatePct: 0 });
  assert.equal(summary!.total, 25);
  assert.equal(summary!.results.length, 25);
  assert.equal(rec.creates, 25);
});

test("active workers never exceed configured concurrency", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  await c.start({ totalRuns: 100, concurrency: 5, failureRatePct: 10 });
  assert.ok(rec.maxConcurrent <= 5, `maxConcurrent ${rec.maxConcurrent} must be ≤ 5`);
});

test("failure rate yields deterministic exact failures", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const summary = await c.start({ totalRuns: 50, concurrency: 5, failureRatePct: 20 });
  assert.equal(summary!.failed, 10);
  assert.equal(summary!.completed, 40);
});

test("run_key and simulation_user_id are unique across the batch", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const summary = await c.start({ totalRuns: 100, concurrency: 8 });
  assert.equal(new Set(summary!.results.map((r) => r.runKey)).size, 100);
  assert.equal(new Set(summary!.results.map((r) => r.simulationUserId)).size, 100);
  assert.equal(new Set(rec.runKeys).size, 100);
});

test("one failed run does not stop the batch", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const summary = await c.start({ totalRuns: 25, concurrency: 3, failureRatePct: 20 });
  assert.equal(summary!.completed + summary!.failed, 25);
  assert.ok(summary!.failed > 0);
});

test("a persistence (createRun) failure is reported, not fatal", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec, { failCreateAt: 3 });
  const summary = await c.start({ totalRuns: 10, concurrency: 2, failureRatePct: 0 });
  // batch still finishes; the one create failure is surfaced, not thrown
  assert.equal(summary!.results.length, 10);
  assert.ok(c.getProgress().persistenceErrors >= 1);
  assert.equal(c.getProgress().status, "completed");
});

// ── controller: single-flight / double-start ──────────────────────────────────
test("double-start is prevented (second call returns null, no extra runs)", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const p1 = c.start({ totalRuns: 25, concurrency: 3 });
  const p2 = c.start({ totalRuns: 500, concurrency: 20 }); // must be rejected
  const [s1, s2] = await Promise.all([p1, p2]);
  assert.ok(s1 && s1.total === 25);
  assert.equal(s2, null);
  assert.equal(rec.creates, 25); // only the first batch ran
});

test("admin gate blocks start for a non-admin (engine never runs)", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = makeController(rec);
  const summary = await c.start({ totalRuns: 50 }, async () => false);
  assert.equal(summary, null);
  assert.equal(rec.creates, 0);
  assert.equal(c.getProgress().status, "error");
});

// ── controller: fresh state across sequential batches ─────────────────────────
test("two sequential batches keep fully independent state", async () => {
  uuidSeq = 0;
  const recA = freshRec();
  const c = new SimulationBatchController({
    makeSink: () => memorySink(recA),
    engine: { sleep: noSleep, uuid: seqUuid },
  });
  const a = await c.start({ totalRuns: 10, concurrency: 2, failureRatePct: 0 });
  c.reset();
  assert.equal(c.getProgress().status, "idle");

  const recB = freshRec();
  const c2 = new SimulationBatchController({
    makeSink: () => memorySink(recB),
    engine: { sleep: noSleep, uuid: seqUuid },
  });
  const b = await c2.start({ totalRuns: 25, concurrency: 4, failureRatePct: 20 });

  assert.equal(a!.total, 10);
  assert.equal(b!.total, 25);
  // no run_key overlap between the two batches (uuids kept incrementing)
  const overlap = a!.results.map((r) => r.runKey).filter((k) => b!.results.some((x) => x.runKey === k));
  assert.equal(overlap.length, 0);
  assert.equal(b!.failed, 5); // 20% of 25, independent of batch A
});

// ── controller: cancellation ──────────────────────────────────────────────────
test("cancelling a batch settles every run terminally", async () => {
  uuidSeq = 0;
  const rec = freshRec();
  const c = new SimulationBatchController({
    makeSink: () => memorySink(rec),
    engine: { sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 2))), uuid: seqUuid },
  });
  const p = c.start({ totalRuns: 50, concurrency: 3, failureRatePct: 0, minStageDelayMs: 2, maxStageDelayMs: 4 });
  setTimeout(() => c.cancel(), 5);
  const summary = await p;
  assert.ok(summary);
  assert.equal(summary!.completed + summary!.failed + summary!.cancelled, summary!.results.length);
  // no created run left in a non-terminal state
  for (const [, st] of rec.statuses) assert.ok(["completed", "failed", "cancelled"].includes(st));
  assert.equal(c.getProgress().status, "cancelled");
});

// ── simulation mode reaches NO external providers ─────────────────────────────
// Scan CODE ONLY (comments stripped) so wording like "does NOT call OpenAI" in
// a doc-comment cannot trip the guard — we care about real imports/calls.
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");
const readCode = (rel: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

test("engine + controller import no external provider / OpenAI / network", () => {
  for (const rel of [
    "../src/lib/simulation/engine.ts",
    "../src/lib/simulation/batchController.ts",
    "../src/lib/simulation/profiles.ts",
    "../src/lib/simulation/config.ts",
  ]) {
    const code = readCode(rel);
    assert.ok(!/openai/i.test(code), `${rel} must not reference OpenAI`);
    assert.ok(!/arbeitnow/i.test(code), `${rel} must not reference Arbeitnow`);
    assert.ok(!/\bfetch\s*\(/.test(code), `${rel} must not call fetch`);
    assert.ok(!/nodemailer|sendmail|smtp/i.test(code), `${rel} must not send email`);
    assert.ok(!/jobs\/providers/.test(code), `${rel} must not import a job provider`);
  }
});

test("the supabase sink only writes workflow tables (no provider/email/apply)", () => {
  const code = readCode("../src/lib/simulation/supabaseSink.ts");
  assert.ok(!/openai/i.test(code));
  assert.ok(!/arbeitnow/i.test(code));
  assert.ok(!/\bfetch\s*\(/.test(code));
  assert.ok(!/\bfetch\s*\(|employer|nodemailer|smtp/i.test(code));
});
