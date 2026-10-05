// Contract-level tests for the AI request path — designed to catch a real
// method/route regression like the Improve 405 (not just source strings).
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/aiRouteContract.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const RESUME_ROUTES = ["analyze", "generate", "improve", "tools", "parse"];

test("every resume API route exports POST and no conflicting HTTP method", () => {
  for (const r of RESUME_ROUTES) {
    const src = read(`../src/app/api/resume/${r}/route.ts`);
    assert.ok(/export\s+async\s+function\s+POST\s*\(/.test(src), `${r} route must export POST`);
    for (const m of ["GET", "PUT", "PATCH", "DELETE", "HEAD"]) {
      assert.ok(
        !new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\s*\\(`).test(src),
        `${r} route must not export ${m} (would change the method contract)`
      );
    }
  }
});

test("AI Assistant client sends Generate and Improve through the shared POST helper", () => {
  const c = read("../src/app/components/resume-builder/AIAssistantPanel.tsx");
  // Requests go through postResumeAI() (the one place that pins method POST),
  // never a raw fetch that could drift to another method.
  assert.ok(c.includes('postResumeAI("/api/resume/generate"'), "Generate → postResumeAI(/api/resume/generate)");
  assert.ok(c.includes('postResumeAI("/api/resume/improve"'), "Improve/Rewrite/Shorten/Translate → postResumeAI(/api/resume/improve)");
  assert.ok(!/fetch\("\/api\/resume\/(generate|improve)"/.test(c), "no raw fetch to the AI routes remains");
  // The helper itself must enforce POST + JSON.
  const helper = read("../src/lib/resume/aiRequest.ts");
  assert.ok(/method:\s*"POST"/.test(helper), "helper pins method POST");
  assert.ok(/"Content-Type":\s*"application\/json"/.test(helper), "helper sends JSON");
});

test("streaming AI routes are dynamic on the Node runtime (prevents 405 from static route caching)", () => {
  for (const r of ["improve", "generate", "tools"]) {
    const src = read(`../src/app/api/resume/${r}/route.ts`);
    assert.ok(src.includes('export const dynamic = "force-dynamic"'), `${r} route is force-dynamic`);
    assert.ok(src.includes('export const runtime = "nodejs"'), `${r} route pins the node runtime`);
  }
});

test("Improve route accepts the client's action contract (improve/rewrite/shorten/translate)", () => {
  const src = read("../src/app/api/resume/improve/route.ts");
  for (const action of ["improve", "rewrite", "shorten", "translate"]) {
    assert.ok(src.includes(`"${action}"`), `improve route handles action "${action}"`);
  }
});

test("AI failures surface a friendly message, never raw server text like 'Method Not Allowed'", () => {
  const c = read("../src/app/components/resume-builder/AIAssistantPanel.tsx");
  assert.ok(c.includes("We couldn't generate an AI suggestion"), "friendly Improve error");
  assert.ok(c.includes("We couldn't generate an AI draft"), "friendly Generate error");
  // The raw error message must not be piped straight to the user in the catch.
  assert.ok(!/setError\(err instanceof Error \? err\.message/.test(c), "raw err.message is not shown to the user");
  assert.ok(!/Method Not Allowed/.test(c), "no hardcoded raw status text in the UI");
});
