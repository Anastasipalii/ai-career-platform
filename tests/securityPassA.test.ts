// ============================================================================
// Security Pass A — server auth, rate limiting, concurrency, input caps.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/securityPassA.test.ts
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { extractBearerToken, authenticate, type AuthedUser } from "@/lib/auth/serverAuth";
import { withGuard } from "@/lib/security/guard";
import {
  hitWindow,
  acquireConcurrency,
  __setNow,
  __resetRateLimiter,
} from "@/lib/security/rateLimiter";
import { checkStructuralCaps } from "@/lib/security/bodyCaps";
import { CAPS, TIERS } from "@/lib/security/config";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const req = (opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers ?? {}) };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  return new Request("https://app.test/api/x", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? { resumeText: "hi" }),
  });
};

// A verifier that accepts "good-<id>" tokens and rejects everything else.
const verifier = async (token: string): Promise<AuthedUser | null> => {
  const m = /^good-(.+)$/.exec(token);
  return m ? { id: m[1], email: `${m[1]}@test` } : null;
};

const ok = () => new Response(JSON.stringify({ data: "ok" }), { status: 200 });

// ── AUTH ────────────────────────────────────────────────────────────────────

test("extractBearerToken parses a well-formed header and rejects malformed ones", () => {
  assert.equal(extractBearerToken({ headers: { get: () => "Bearer abc.def" } }), "abc.def");
  assert.equal(extractBearerToken({ headers: { get: () => "bearer xyz" } }), "xyz");
  assert.equal(extractBearerToken({ headers: { get: () => "Basic abc" } }), null);
  assert.equal(extractBearerToken({ headers: { get: () => null } }), null);
  assert.equal(extractBearerToken({ headers: { get: () => "Bearer   " } }), null);
});

test("authenticate returns the verified user for a valid token, null otherwise", async () => {
  assert.deepEqual(await authenticate(req({ token: "good-userA" }), verifier), { id: "userA", email: "userA@test" });
  assert.equal(await authenticate(req({ token: "bad" }), verifier), null);
  assert.equal(await authenticate(req({}), verifier), null);
});

test("unauthenticated paid request → 401 and the provider handler is NEVER called", async () => {
  __resetRateLimiter();
  let called = 0;
  const res = await withGuard(req({}), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier });
  assert.equal(res.status, 401);
  assert.equal(called, 0, "handler (and thus the provider) must not run on auth failure");
  const body = await res.json();
  assert.match(body.error, /sign in/i);
});

test("authenticated request passes the guard and runs the handler exactly once", async () => {
  __resetRateLimiter();
  let called = 0;
  const res = await withGuard(req({ token: "good-u1" }), "EXPENSIVE_AI", async (user) => {
    called++;
    assert.equal(user.id, "u1");
    return ok();
  }, { verifier });
  assert.equal(res.status, 200);
  assert.equal(called, 1);
});

test("client-supplied user_id in the body cannot impersonate — identity comes only from the token", async () => {
  __resetRateLimiter();
  let seen: string | null = null;
  const res = await withGuard(
    req({ token: "good-realUser", body: { user_id: "attacker", userId: "attacker", resumeText: "x" } }),
    "EXPENSIVE_AI",
    async (user) => { seen = user.id; return ok(); },
    { verifier },
  );
  assert.equal(res.status, 200);
  assert.equal(seen, "realUser", "guard must derive identity from the JWT, never from the body");
});

// ── RATE LIMIT (unit: pure window) ───────────────────────────────────────────

test("hitWindow allows up to max then denies, with a Retry-After hint", () => {
  __resetRateLimiter();
  __setNow(() => 1_000_000);
  for (let i = 0; i < 5; i++) assert.equal(hitWindow("k", 60_000, 5).ok, true, `req ${i} allowed`);
  const denied = hitWindow("k", 60_000, 5);
  assert.equal(denied.ok, false);
  assert.ok(denied.retryAfterSec >= 1 && denied.retryAfterSec <= 60);
});

test("different users do NOT share a quota", () => {
  __resetRateLimiter();
  __setNow(() => 2_000_000);
  for (let i = 0; i < 5; i++) hitWindow("EXPENSIVE_AI:window:userA", 60_000, 5);
  assert.equal(hitWindow("EXPENSIVE_AI:window:userA", 60_000, 5).ok, false, "userA exhausted");
  assert.equal(hitWindow("EXPENSIVE_AI:window:userB", 60_000, 5).ok, true, "userB unaffected");
});

test("rate-limited request → 429 with Retry-After, and the provider handler is NEVER called", async () => {
  __resetRateLimiter();
  __setNow(() => 3_000_000);
  const burstMax = TIERS.EXPENSIVE_AI.burst.max;
  let called = 0;
  const handler = async () => { called++; return ok(); };
  // Exhaust the burst window.
  for (let i = 0; i < burstMax; i++) {
    const r = await withGuard(req({ token: "good-rl" }), "EXPENSIVE_AI", handler, { verifier });
    assert.equal(r.status, 200, `allowed call ${i}`);
  }
  const limited = await withGuard(req({ token: "good-rl" }), "EXPENSIVE_AI", handler, { verifier });
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get("Retry-After"), "Retry-After header present");
  assert.equal(called, burstMax, "provider handler not called on the rate-limited request");
});

// ── CONCURRENCY ──────────────────────────────────────────────────────────────

test("acquireConcurrency caps simultaneous in-flight and releases cleanly", () => {
  __resetRateLimiter();
  const a = acquireConcurrency("c", 2);
  const b = acquireConcurrency("c", 2);
  const c = acquireConcurrency("c", 2);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(c.ok, false, "third concurrent request denied");
  a.release();
  const d = acquireConcurrency("c", 2);
  assert.equal(d.ok, true, "slot freed after release");
  a.release(); // idempotent
  b.release(); d.release();
});

// ── INPUT CAPS ───────────────────────────────────────────────────────────────

test("checkStructuralCaps rejects oversized strings, arrays, and depth; accepts normal payloads", () => {
  assert.equal(checkStructuralCaps({ resumeText: "normal résumé" }).ok, true);
  assert.equal(checkStructuralCaps({ resumeText: "x".repeat(CAPS.MAX_STRING_LEN + 1) }).ok, false);
  assert.equal(checkStructuralCaps({ jobs: new Array(CAPS.MAX_ARRAY_LEN + 1).fill(0) }).ok, false);
  // Deep nesting.
  let deep: unknown = "leaf";
  for (let i = 0; i < CAPS.MAX_DEPTH + 2; i++) deep = { n: deep };
  assert.equal(checkStructuralCaps(deep).ok, false);
});

test("oversized résumé text → 413 before the provider handler runs", async () => {
  __resetRateLimiter();
  let called = 0;
  const big = { resumeText: "x".repeat(CAPS.MAX_STRING_LEN + 10) };
  const res = await withGuard(req({ token: "good-big", body: big }), "EXPENSIVE_AI",
    async () => { called++; return ok(); }, { verifier });
  assert.equal(res.status, 413);
  assert.equal(called, 0, "cap rejection must precede the provider call");
});

test("oversized translation source → 413 before provider", async () => {
  __resetRateLimiter();
  let called = 0;
  // An oversized translation source string (over the per-string cap).
  const huge = { text: "y".repeat(CAPS.MAX_STRING_LEN + 1), sourceLanguage: "German", targetLanguage: "English (US)" };
  const r = new Request("https://app.test/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer good-t" },
    body: JSON.stringify(huge),
  });
  const res = await withGuard(r, "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier });
  assert.equal(res.status, 413, "oversized source rejected before provider");
  assert.equal(called, 0);
});

test("a request exceeding the total body-byte cap → 413", async () => {
  __resetRateLimiter();
  let called = 0;
  // Many max-length strings in an array → total body well over MAX_BODY_BYTES.
  const n = Math.ceil(CAPS.MAX_BODY_BYTES / CAPS.MAX_STRING_LEN) + 2;
  const arr = new Array(n).fill("a".repeat(CAPS.MAX_STRING_LEN));
  const r = new Request("https://app.test/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer good-b" },
    body: JSON.stringify({ items: arr }),
  });
  const res = await withGuard(r, "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier });
  assert.equal(res.status, 413);
  assert.equal(called, 0);
});

test("malformed JSON → 400 before the provider handler runs", async () => {
  __resetRateLimiter();
  let called = 0;
  const r = new Request("https://app.test/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer good-j" },
    body: "{not valid json",
  });
  const res = await withGuard(r, "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier });
  assert.equal(res.status, 400);
  assert.equal(called, 0);
});

// ── SECRETS ──────────────────────────────────────────────────────────────────

test("server auth uses the ANON key (never a service-role key)", () => {
  const src = read("../src/lib/auth/serverAuth.ts");
  assert.ok(src.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "verifier uses anon key");
  // The helper must never READ a service-role key from the environment
  // (the words may appear in a comment that forbids it — that's fine).
  assert.ok(!/process\.env\.\w*SERVICE_ROLE/i.test(src), "no service-role key is read");
});

test("no route leaks a provider/service key to the client, and none imports a service-role key", () => {
  const files = [
    "analyze", "generate", "improve", "tools", "parse", "requirements",
  ].map((r) => read(`../src/app/api/resume/${r}/route.ts`));
  for (const src of files) {
    assert.ok(!/process\.env\.\w*SERVICE_ROLE/i.test(src), "no service-role key is read in a route");
    // The key VALUE (process.env.OPENAI_API_KEY) may only be read for a presence
    // guard or passed to the OpenAI SDK constructor — never placed into a
    // response/JSON body. (The variable NAME may safely appear in a help string;
    // that is not the secret value.)
    for (const line of src.split("\n")) {
      if (!line.includes("process.env.OPENAI_API_KEY")) continue;
      const safe = /!process\.env\.OPENAI_API_KEY/.test(line) ||
                   /apiKey:\s*process\.env\.OPENAI_API_KEY/.test(line);
      assert.ok(safe, `OPENAI_API_KEY value only read for a guard or the SDK, never returned: ${line.trim()}`);
    }
  }
});

test("client code contains no service-role key and no raw OpenAI key reference", () => {
  const client = read("../src/lib/auth/authedFetch.ts") + read("../src/lib/supabase.ts");
  assert.ok(!/SERVICE_ROLE/i.test(client));
  assert.ok(!/OPENAI_API_KEY/i.test(client));
});

// ── ROUTE COVERAGE: every live route is guarded ──────────────────────────────

const ALL_ROUTES = [
  "application/prepare", "career-path/generate",
  "cover-letter/agent", "cover-letter/generate", "cover-letter/standalone",
  "interview/feedback", "interview/generate",
  "job-match/agent", "job-match/analyze", "jobs/search",
  "linkedin/optimize", "linkedin/tools", "resume-translation/translate",
  "resume/analyze", "resume/generate", "resume/improve", "resume/parse",
  "resume/requirements", "resume/tools",
];

test("every live cost-bearing API route is wrapped by withGuard", () => {
  for (const r of ALL_ROUTES) {
    const src = read(`../src/app/api/${r}/route.ts`);
    assert.ok(/import \{ withGuard \} from "@\/lib\/security\/guard"/.test(src), `${r} imports withGuard`);
    assert.ok(/return withGuard\(req,\s*"(EXPENSIVE_AI|PROVIDER_SEARCH)"/.test(src), `${r} calls withGuard`);
  }
});

test("jobs/search uses the PROVIDER_SEARCH tier; OpenAI routes use EXPENSIVE_AI", () => {
  const jobs = read("../src/app/api/jobs/search/route.ts");
  assert.ok(/withGuard\(req,\s*"PROVIDER_SEARCH"/.test(jobs));
  const analyze = read("../src/app/api/resume/analyze/route.ts");
  assert.ok(/withGuard\(req,\s*"EXPENSIVE_AI"/.test(analyze));
});

// ── CLIENT TRANSPORT ─────────────────────────────────────────────────────────

test("no client component makes a raw fetch to /api — all go through authedFetch", () => {
  const clientFiles = [
    "../src/app/components/apply/ApplyPreviewClient.tsx",
    "../src/app/components/career-path/CareerPathClient.tsx",
    "../src/app/components/cover-letter/CoverLetterClient.tsx",
    "../src/app/components/interview-coach/InterviewClient.tsx",
    "../src/app/components/job-match/JobMatchClient.tsx",
    "../src/app/components/linkedin-optimizer/LinkedInClient.tsx",
    "../src/app/components/resume-translation/ResumeTranslationClient.tsx",
    "../src/app/components/resume-builder/AIFeaturesPanel.tsx",
    "../src/app/components/resume-builder/ResumeImportPanel.tsx",
    "../src/app/components/resume-builder/TranslationPanel.tsx",
  ];
  for (const f of clientFiles) {
    const src = read(f);
    assert.ok(!/[^d]fetch\("\/api\//.test(src), `${f} has no raw fetch("/api/`);
    assert.ok(src.includes('authedFetch } from "@/lib/auth/authedFetch"'), `${f} imports authedFetch`);
  }
});

test("shared request helpers send through authedFetch", () => {
  assert.ok(read("../src/lib/resume/aiRequest.ts").includes("return authedFetch(u, init)"));
  assert.ok(read("../src/app/components/ai-workflow/WorkflowCanvas.tsx").includes("authedFetch(url, {"));
  assert.ok(read("../src/app/components/resume-builder/AIFeaturesPanel.tsx").includes("authedFetch(endpoint, {"));
});

test("authedFetch attaches a bearer token and never puts identity in the body", () => {
  const src = read("../src/lib/auth/authedFetch.ts");
  assert.ok(/Authorization.*Bearer/.test(src), "sets Authorization: Bearer");
  assert.ok(src.includes("access_token"), "reads the Supabase access token");
  assert.ok(!/user_id/.test(src), "no user_id smuggled into requests");
});
