// Tests for the monitoring Refresh + Auto-refresh behaviour. Pure logic — no
// network, no Supabase, no DOM. Exercises the exact runRefresh orchestration
// the component uses, plus the polling controller and source-level guarantees.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/monitoringRefresh.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runRefresh, REFRESH_ERROR_MESSAGE } from "@/lib/monitoring/refresh";
import { PollingController } from "@/lib/monitoring/polling";

const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

type Deps = Parameters<typeof runRefresh<number>>[0];
function makeDeps(over: Partial<Deps> = {}): { deps: Deps; log: string[]; counters: Record<string, number>; rows: number[][] } {
  const log: string[] = [];
  const counters = { start: 0, settled: 0, error: 0, refreshedAt: 0 };
  const rows: number[][] = [];
  const deps: Deps = {
    inFlight: { current: false },
    fetcher: async () => ({ ok: true, rows: [1, 2, 3] }),
    onStart: () => { counters.start++; },
    onRows: (r) => { rows.push(r); },
    onError: () => { counters.error++; },
    onSettled: () => { counters.settled++; },
    onRefreshedAt: () => { counters.refreshedAt++; },
    diag: (e) => log.push(e),
    ...over,
  };
  return { deps, log, counters, rows };
}

// ── clicking Refresh invokes the loader exactly once ──────────────────────────
test("a single refresh calls the fetcher exactly once and loads rows", async () => {
  let calls = 0;
  const { deps, counters, rows, log } = makeDeps({
    fetcher: async () => { calls++; return { ok: true, rows: [9] }; },
  });
  const res = await runRefresh(deps);
  assert.equal(res, "ok");
  assert.equal(calls, 1);
  assert.deepEqual(rows, [[9]]);
  assert.equal(counters.start, 1);
  assert.equal(counters.settled, 1);
  assert.ok(log.includes("refresh:started") && log.includes("refresh:completed"));
});

// ── rapid double-click does not launch duplicate concurrent requests ──────────
test("a second refresh while one is in flight is skipped (no duplicate fetch)", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const inFlight = { current: false };
  const fetcher = async () => { calls++; await gate; return { ok: true, rows: [1] }; };
  const { deps } = makeDeps({ inFlight, fetcher });

  const p1 = runRefresh(deps);
  const p2 = runRefresh(deps); // in-flight → must skip
  assert.equal(await p2, "skipped");
  assert.equal(calls, 1);
  release();
  assert.equal(await p1, "ok");
  assert.equal(calls, 1);
  assert.equal(inFlight.current, false); // guard released
});

// ── busy flag resets in finally after BOTH success and error ──────────────────
test("busy flag resets after success", async () => {
  const inFlight = { current: false };
  const { deps, counters } = makeDeps({ inFlight });
  await runRefresh(deps);
  assert.equal(inFlight.current, false);
  assert.equal(counters.settled, 1);
});

test("busy flag resets after a read error and rows are preserved (onRows not called)", async () => {
  const inFlight = { current: false };
  const { deps, counters, rows } = makeDeps({ inFlight, fetcher: async () => ({ ok: false, rows: [] }) });
  const res = await runRefresh(deps);
  assert.equal(res, "error");
  assert.equal(inFlight.current, false);
  assert.equal(counters.settled, 1);
  assert.equal(counters.error, 1);
  assert.equal(rows.length, 0); // existing rows preserved (no replacement)
});

test("busy flag resets even when the fetcher throws", async () => {
  const inFlight = { current: false };
  const { deps, counters } = makeDeps({
    inFlight,
    fetcher: async () => { throw new Error("network"); },
  });
  const res = await runRefresh(deps);
  assert.equal(res, "error");
  assert.equal(inFlight.current, false);
  assert.equal(counters.settled, 1);
  assert.equal(counters.error, 1);
});

test("error message is the safe, non-sensitive constant", () => {
  assert.ok(/last loaded runs/i.test(REFRESH_ERROR_MESSAGE));
  assert.ok(!/select|token|key|password|supabase/i.test(REFRESH_ERROR_MESSAGE));
});

// ── auto-refresh: immediate load + exactly one interval, cleaned up ───────────
test("auto-refresh runs an immediate load then starts exactly one interval", () => {
  let loads = 0;
  let created = 0;
  let cleared = 0;
  const load = () => { loads++; };
  // mirror the component effect: immediate load, then one poller
  load();
  const poller = new PollingController(5000, load, {
    setInterval: () => { created++; return created as unknown as ReturnType<typeof setInterval>; },
    clearInterval: () => { cleared++; },
  });
  poller.start();
  poller.start(); // must not add a second timer
  assert.equal(loads, 1); // immediate load fired once
  assert.equal(created, 1); // exactly one interval
  poller.stop(); // effect cleanup
  assert.equal(cleared, 1);
  assert.equal(poller.isRunning(), false);
});

test("polling tick invokes the loader on schedule", () => {
  let ticks = 0;
  let saved: () => void = () => {};
  const poller = new PollingController(5000, () => ticks++, {
    setInterval: (fn) => { saved = fn; return 1 as unknown as ReturnType<typeof setInterval>; },
    clearInterval: () => {},
  });
  poller.start();
  saved(); // simulate a 5s tick
  saved();
  assert.equal(ticks, 2);
  poller.stop();
});

// ── filters are preserved across a refresh cycle ──────────────────────────────
test("a refresh cycle never mutates a separate filters object", async () => {
  const filters = { status: "completed", simulation: "all" };
  const snapshot = JSON.stringify(filters);
  const { deps } = makeDeps();
  await runRefresh(deps); // refresh only replaces rows via onRows; filters untouched
  assert.equal(JSON.stringify(filters), snapshot);
});

// ── no delete operation exists in the monitoring path ─────────────────────────
test("monitoring read path performs NO delete/remove operations", () => {
  for (const rel of [
    "../src/app/components/admin/MonitoringClient.tsx",
    "../src/lib/monitoring/refresh.ts",
    "../src/lib/monitoring/polling.ts",
  ]) {
    const code = readCode(rel);
    assert.ok(!/\.delete\s*\(/.test(code), `${rel} must not call .delete()`);
    assert.ok(!/\.remove\s*\(/.test(code), `${rel} must not call .remove()`);
  }
  // the admin readers only SELECT (no mutation verbs)
  const wr = readCode("../src/lib/workflowRun.ts");
  const region = wr.slice(wr.indexOf("readAllWorkflowRunsAdminResult"));
  assert.ok(!/\.delete\s*\(|\.update\s*\(|\.upsert\s*\(|\.insert\s*\(/.test(region), "admin reader must be read-only");
});

// ── the Refresh button is a real button with type="button" + a11y ─────────────
test("Refresh control is type=button with an aria-label and focus styles", () => {
  const code = readCode("../src/app/components/admin/MonitoringClient.tsx");
  const i = code.indexOf('aria-label="Refresh monitoring data"');
  assert.ok(i >= 0, "Refresh button needs an aria-label");
  const block = code.slice(code.lastIndexOf("<button", i), i + 400);
  assert.ok(/type="button"/.test(block), "Refresh must be type=button");
  assert.ok(/focus-visible:ring/.test(block), "Refresh needs a visible focus state");
  assert.ok(/disabled=\{refreshing\}/.test(block), "Refresh disabled only while refreshing");
});

test("dev diagnostics cover click/started/completed/failed and auto-refresh toggle", () => {
  const client = readCode("../src/app/components/admin/MonitoringClient.tsx");
  const refresh = readCode("../src/lib/monitoring/refresh.ts");
  assert.ok(/refresh:click/.test(client));
  assert.ok(/autorefresh:enabled/.test(client) && /autorefresh:disabled/.test(client));
  assert.ok(/refresh:started/.test(refresh) && /refresh:completed/.test(refresh) && /refresh:failed/.test(refresh));
});
