// Runtime-relevant contract tests for the Resume Builder AI request layer.
// The previous source-string test passed while the real browser still sent GET,
// because it only inspected component text. These exercise the shared helper the
// way it actually runs: they build the request and drive it through a mocked
// global fetch, asserting method + body actually reach fetch — the exact class of
// regression (POST silently becoming GET, or the body being dropped) that a
// source scan cannot see.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/aiRequest.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResumeAIRequest, postResumeAI, looksLikeExternalCacheBust } from "@/lib/resume/aiRequest";

test("buildResumeAIRequest always produces a POST with a JSON body", () => {
  const payload = { action: "improve", text: "Managed a team.", context: "pm resume" };
  const { url, init } = buildResumeAIRequest("/api/resume/improve", payload);
  assert.equal(url, "/api/resume/improve");
  assert.equal(init.method, "POST", "method must be POST");
  assert.deepEqual(init.headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(init.body as string), payload, "body round-trips unchanged");
});

test("postResumeAI passes method POST and the JSON body through to fetch at runtime", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const original = globalThis.fetch;
  // Capture exactly what reaches fetch — this is the request the browser would send.
  globalThis.fetch = (async (u: string, init: RequestInit) => {
    calls.push({ url: u, init });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    const payload = { jobTitle: "PM", yearsExperience: 5 };
    const res = await postResumeAI("/api/resume/generate", payload);
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1, "fetch called once");
    assert.equal(calls[0].url, "/api/resume/generate");
    assert.equal(calls[0].init.method, "POST", "the method reaching fetch is POST, not GET");
    assert.deepEqual(JSON.parse(calls[0].init.body as string), payload, "the body survives to fetch");
    assert.ok(!/[?&]cache-bust=/.test(calls[0].url), "the app never adds a cache-bust param");
  } finally {
    globalThis.fetch = original;
  }
});

test("looksLikeExternalCacheBust flags the extension/proxy fingerprint, not Next's own param", () => {
  assert.equal(looksLikeExternalCacheBust("/api/resume/improve?cache-bust=1790248799944"), true);
  assert.equal(looksLikeExternalCacheBust("/api/resume/improve?x=1&cache-bust=42"), true);
  assert.equal(looksLikeExternalCacheBust("/api/resume/improve"), false, "clean URL is fine");
  assert.equal(looksLikeExternalCacheBust("/api/resume/improve?_rsc=abc123"), false, "Next's own _rsc is not flagged");
});
