// ============================================================================
// Durable distributed rate limiter — helper + guard integration.
// The DB boundary is MOCKED; no test touches real Supabase.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/durableRateLimit.test.ts
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildRpcArgs,
  parseRpcResponse,
  durableRateLimitHit,
  type RpcInvoker,
} from "@/lib/security/durableRateLimit";
import { withGuard } from "@/lib/security/guard";
import { __resetRateLimiter } from "@/lib/security/rateLimiter";
import { TIERS, type RateTier } from "@/lib/security/config";
import type { AuthedUser } from "@/lib/auth/serverAuth";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const verifier = async (token: string): Promise<AuthedUser | null> => {
  const m = /^good-(.+)$/.exec(token);
  return m ? { id: m[1], email: `${m[1]}@test` } : null;
};
const req = (token?: string) =>
  new Request("https://app.test/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ resumeText: "hi" }),
  });
const ok = () => new Response(JSON.stringify({ data: "ok" }), { status: 200 });

const allow = { allowed: true, count: 1, limit: 30, retry_after: 0 };
const deny = { allowed: false, count: 31, limit: 30, retry_after: 42 };

// ── buildRpcArgs: ONLY p_tier ────────────────────────────────────────────────

test("C/D/E: RPC args contain ONLY p_tier — no user_id, max, or window", () => {
  const args = buildRpcArgs("EXPENSIVE_AI") as Record<string, unknown>;
  assert.deepEqual(Object.keys(args), ["p_tier"]);
  assert.equal(args.p_tier, "EXPENSIVE_AI");
  assert.ok(!("user_id" in args) && !("p_user_id" in args), "no user_id");
  assert.ok(!("max" in args) && !("p_max" in args), "no max");
  assert.ok(!("window_seconds" in args) && !("p_window_seconds" in args), "no window");
});

// ── parseRpcResponse: untrusted data validation ──────────────────────────────

test("K: malformed RPC responses are rejected (→ null → unavailable)", () => {
  assert.equal(parseRpcResponse(null), null);
  assert.equal(parseRpcResponse("nope"), null);
  assert.equal(parseRpcResponse({}), null);
  assert.equal(parseRpcResponse({ allowed: "yes", count: 1, limit: 30, retry_after: 0 }), null);
  assert.equal(parseRpcResponse({ allowed: true, count: -1, limit: 30, retry_after: 0 }), null);
  assert.equal(parseRpcResponse({ allowed: true, count: 1, limit: 0, retry_after: 0 }), null);
  assert.equal(parseRpcResponse({ allowed: false, count: 1, limit: 30, retry_after: -5 }), null);
  assert.equal(parseRpcResponse({ allowed: true, count: NaN, limit: 30, retry_after: 0 }), null);
  assert.deepEqual(parseRpcResponse(allow), { allowed: true, count: 1, limit: 30, retry_after: 0 });
});

// ── durableRateLimitHit statuses ─────────────────────────────────────────────

test("helper maps allow/deny/error/malformed to the right status", async () => {
  const okInv: RpcInvoker = async () => allow;
  const denyInv: RpcInvoker = async () => deny;
  const throwInv: RpcInvoker = async () => { throw new Error("network"); };
  const badInv: RpcInvoker = async () => ({ garbage: true });
  assert.equal((await durableRateLimitHit("EXPENSIVE_AI", "t", okInv)).status, "allowed");
  const d = await durableRateLimitHit("EXPENSIVE_AI", "t", denyInv);
  assert.equal(d.status, "denied");
  assert.equal(d.retryAfter, 42);
  assert.equal((await durableRateLimitHit("EXPENSIVE_AI", "t", throwInv)).status, "unavailable");
  assert.equal((await durableRateLimitHit("EXPENSIVE_AI", "t", badInv)).status, "unavailable");
  assert.equal((await durableRateLimitHit("EXPENSIVE_AI", "", okInv)).status, "unavailable", "no token → unavailable");
});

// ── GUARD INTEGRATION ─────────────────────────────────────────────────────────

test("A/B: durable RPC is invoked for both tiers with the correct tier", async () => {
  for (const tier of ["EXPENSIVE_AI", "PROVIDER_SEARCH"] as RateTier[]) {
    __resetRateLimiter();
    const seen: string[] = [];
    const inv: RpcInvoker = async (t) => { seen.push(t); return allow; };
    const res = await withGuard(req("good-u1"), tier, async () => ok(), { verifier, durableInvoker: inv });
    assert.equal(res.status, 200);
    assert.deepEqual(seen, [tier], `invoked once with ${tier}`);
  }
});

test("D (guard): the durable invoker receives only (tier, token) — never a user_id", async () => {
  __resetRateLimiter();
  let gotTier = ""; let gotToken = "";
  const inv: RpcInvoker = async (t, tok) => { gotTier = t; gotToken = tok; return allow; };
  await withGuard(req("good-realUser"), "EXPENSIVE_AI", async () => ok(), { verifier, durableInvoker: inv });
  assert.equal(gotTier, "EXPENSIVE_AI");
  assert.equal(gotToken, "good-realUser", "forwards the verified bearer token, not a user_id");
});

test("F: allowed=true proceeds to the handler", async () => {
  __resetRateLimiter();
  let called = 0;
  const inv: RpcInvoker = async () => allow;
  const res = await withGuard(req("good-u1"), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier, durableInvoker: inv });
  assert.equal(res.status, 200);
  assert.equal(called, 1);
});

test("G/H/I: allowed=false → 429 + Retry-After, provider NOT called", async () => {
  __resetRateLimiter();
  let called = 0;
  const inv: RpcInvoker = async () => deny;
  const res = await withGuard(req("good-u1"), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier, durableInvoker: inv });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "42");
  assert.equal(called, 0, "handler/provider must not run after durable denial");
});

test("J: durable RPC failure FAILS OPEN to local limits (handler still runs)", async () => {
  __resetRateLimiter();
  let called = 0;
  const inv: RpcInvoker = async () => { throw new Error("supabase down"); };
  const res = await withGuard(req("good-u1"), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier, durableInvoker: inv });
  assert.equal(res.status, 200, "fail-open on durable outage");
  assert.equal(called, 1);
});

test("K (guard): malformed RPC response fails open", async () => {
  __resetRateLimiter();
  let called = 0;
  const inv: RpcInvoker = async () => ({ not: "valid" });
  const res = await withGuard(req("good-u1"), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier, durableInvoker: inv });
  assert.equal(res.status, 200);
  assert.equal(called, 1);
});

test("L: authentication failure stays FAIL-CLOSED (durable never consulted)", async () => {
  __resetRateLimiter();
  let invoked = 0, called = 0;
  const inv: RpcInvoker = async () => { invoked++; return allow; };
  const res = await withGuard(req(), "EXPENSIVE_AI", async () => { called++; return ok(); }, { verifier, durableInvoker: inv });
  assert.equal(res.status, 401);
  assert.equal(invoked, 0, "durable limiter not reached without auth");
  assert.equal(called, 0);
});

test("M: local burst protection still fires before the durable layer", async () => {
  __resetRateLimiter();
  const burstMax = TIERS.EXPENSIVE_AI.burst.max;
  let invoked = 0;
  const inv: RpcInvoker = async () => { invoked++; return allow; };
  for (let i = 0; i < burstMax; i++) {
    const r = await withGuard(req("good-burst"), "EXPENSIVE_AI", async () => ok(), { verifier, durableInvoker: inv });
    assert.equal(r.status, 200);
  }
  const limited = await withGuard(req("good-burst"), "EXPENSIVE_AI", async () => ok(), { verifier, durableInvoker: inv });
  assert.equal(limited.status, 429, "local burst still rejects");
  assert.equal(invoked, burstMax, "durable not consulted on the locally-rejected request");
});

test("N: concurrency protection still runs AFTER a durable allow", async () => {
  __resetRateLimiter();
  const inv: RpcInvoker = async () => allow;
  const max = TIERS.EXPENSIVE_AI.concurrency;
  let release: (() => void) | null = null;
  const gate = new Promise<void>((r) => { release = () => r(); });
  const inflight: Promise<Response>[] = [];
  for (let i = 0; i < max; i++) {
    inflight.push(withGuard(req("good-cc"), "EXPENSIVE_AI", async () => { await gate; return ok(); }, { verifier, durableInvoker: inv }));
  }
  // allow the in-flight handlers to register, then one more should be busy-rejected
  await new Promise((r) => setTimeout(r, 10));
  const extra = await withGuard(req("good-cc"), "EXPENSIVE_AI", async () => ok(), { verifier, durableInvoker: inv });
  assert.equal(extra.status, 429, "concurrency cap still enforced");
  release!();
  await Promise.all(inflight);
});

// ── SOURCE GUARANTEES ─────────────────────────────────────────────────────────

test("O: no service-role key is introduced; only the anon key is used", () => {
  const src = read("../src/lib/security/durableRateLimit.ts");
  assert.ok(!/SERVICE_ROLE/i.test(src), "no service-role reference");
  assert.ok(src.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "uses anon key");
  assert.ok(!/p_max|p_window_seconds|p_user_id/.test(src), "never sends max/window/user_id");
  assert.ok(src.includes('rpc("rate_limit_hit"'), "calls the verified RPC");
});

test("P/Q: all 19 live routes still go through withGuard (durable applies to all)", () => {
  const routes = [
    "application/prepare", "career-path/generate",
    "cover-letter/agent", "cover-letter/generate", "cover-letter/standalone",
    "interview/feedback", "interview/generate",
    "job-match/agent", "job-match/analyze", "jobs/search",
    "linkedin/optimize", "linkedin/tools", "resume-translation/translate",
    "resume/analyze", "resume/generate", "resume/improve", "resume/parse",
    "resume/requirements", "resume/tools",
  ];
  for (const r of routes) {
    const src = read(`../src/app/api/${r}/route.ts`);
    assert.ok(/return withGuard\(req,\s*"(EXPENSIVE_AI|PROVIDER_SEARCH)"/.test(src), `${r} wrapped`);
  }
});

test("guard calls the durable limiter before concurrency and after local windows", () => {
  const g = read("../src/lib/security/guard.ts");
  const sustained = g.indexOf('key(tier, user.id, "window")');
  const durable = g.indexOf("durableRateLimitHit(");
  const concurrency = g.indexOf("acquireConcurrency(");
  assert.ok(sustained !== -1 && durable !== -1 && concurrency !== -1);
  assert.ok(sustained < durable, "durable after local sustained window");
  assert.ok(durable < concurrency, "durable before concurrency acquire");
});
