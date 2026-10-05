// ============================================================================
// Security Pass B — account isolation, storage privacy, headers, logging, XSS.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/securityPassB.test.ts
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

// ── In-memory localStorage mock (clear() THROWS so any call fails the test) ──
class MockStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  get length() { return this.m.size; }
  clear() { throw new Error("localStorage.clear() must never be called by CareerAI cleanup"); }
  __keys() { return Array.from(this.m.keys()); }
}
function installStorage() {
  const ls = new MockStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: ls } as unknown;
  (globalThis as unknown as { localStorage: unknown }).localStorage = ls;
  return ls;
}

const CS = () => import("@/lib/security/clientStorage");

// ── STORAGE: user scoping ─────────────────────────────────────────────────────

test("sensitive values are written under a per-user scoped key", async () => {
  installStorage();
  const cs = await CS();
  cs.setCurrentUserId("userA");
  cs.writeScoped("workflow-results", { secret: "A-data" });
  const key = cs.scopedKey("workflow-results");
  assert.equal(key, "careerai:u:userA:workflow-results");
  assert.deepEqual(cs.readScoped("workflow-results"), { secret: "A-data" });
});

test("User B cannot read User A's scoped key, and vice-versa", async () => {
  installStorage();
  const cs = await CS();
  cs.setCurrentUserId("userA");
  cs.writeScoped("resume-file", { bytes: "A" });
  cs.setCurrentUserId("userB");
  assert.equal(cs.readScoped("resume-file"), null, "B sees nothing of A");
  cs.writeScoped("resume-file", { bytes: "B" });
  cs.setCurrentUserId("userA");
  assert.deepEqual(cs.readScoped("resume-file"), { bytes: "A" }, "A still sees only A");
});

test("no owner known → sensitive write is a no-op (never unscoped)", async () => {
  const ls = installStorage();
  const cs = await CS();
  cs.setCurrentUserId(null);
  cs.writeScoped("workflow-results", { secret: "X" });
  assert.deepEqual(ls.__keys(), [], "nothing written when no user is known");
});

// ── STORAGE: legacy cleanup ───────────────────────────────────────────────────

test("legacy UNSCOPED sensitive keys are deleted (never migrated)", async () => {
  const ls = installStorage();
  const cs = await CS();
  for (const k of cs.LEGACY_SENSITIVE_KEYS) ls.setItem(k, "old-sensitive");
  cs.purgeLegacyUnscopedSensitiveKeys();
  for (const k of cs.LEGACY_SENSITIVE_KEYS) assert.equal(ls.getItem(k), null, `${k} deleted`);
});

test("clearCareerAISensitive clears the user's scoped data + legacy keys, keeps foreign keys", async () => {
  const ls = installStorage();
  const cs = await CS();
  cs.setCurrentUserId("userA");
  cs.writeScoped("workflow-results", { x: 1 });
  cs.writeScoped("resume-file", { x: 2 });
  ls.setItem("careerai:workflow-results", "legacy");          // legacy sensitive
  ls.setItem("sb-abc-auth-token", "SUPABASE_SESSION");        // Supabase auth
  ls.setItem("theme", "dark");                                 // unrelated pref
  cs.setCurrentUserId("userB");
  cs.writeScoped("workflow-results", { y: 9 });                // B's own data

  cs.clearCareerAISensitive("userA");

  assert.equal(ls.getItem("careerai:u:userA:workflow-results"), null, "A scoped cleared");
  assert.equal(ls.getItem("careerai:u:userA:resume-file"), null, "A resume bytes cleared");
  assert.equal(ls.getItem("careerai:workflow-results"), null, "legacy cleared");
  assert.equal(ls.getItem("sb-abc-auth-token"), "SUPABASE_SESSION", "Supabase auth key untouched");
  assert.equal(ls.getItem("theme"), "dark", "unrelated pref untouched");
  assert.ok(ls.getItem("careerai:u:userB:workflow-results"), "B's own data untouched");
});

test("the storage helper never calls localStorage.clear()", async () => {
  // Runtime proof: the mock's clear() throws, so any cleanup path that called
  // localStorage.clear() would fail here. Source comments are not scanned.
  installStorage();
  const cs = await CS();
  cs.setCurrentUserId("userA");
  cs.writeScoped("workflow-results", { a: 1 });
  cs.writeScoped("resume-file", { b: 2 });
  assert.doesNotThrow(() => cs.clearCareerAISensitive("userA"));
  assert.doesNotThrow(() => cs.purgeLegacyUnscopedSensitiveKeys());
  assert.doesNotThrow(() => cs.clearUserScoped("userA"));
  // Strip comments, then assert no real localStorage.clear() invocation remains.
  const src = read("../src/lib/security/clientStorage.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.ok(!/localStorage\.clear\s*\(/.test(src), "no localStorage.clear() invocation in code");
});

test("cleanup never removes Supabase auth / unrelated-origin keys", async () => {
  const ls = installStorage();
  const cs = await CS();
  ls.setItem("sb-xyz-auth-token", "sess");
  ls.setItem("supabase.auth.token", "sess2");
  ls.setItem("some-other-app", "keepme");
  cs.setCurrentUserId("userA");
  cs.writeScoped("resume-file", { b: 1 });
  cs.clearCareerAISensitive("userA");
  assert.equal(ls.getItem("sb-xyz-auth-token"), "sess");
  assert.equal(ls.getItem("supabase.auth.token"), "sess2");
  assert.equal(ls.getItem("some-other-app"), "keepme");
});

// ── RESUME BYTES ──────────────────────────────────────────────────────────────

test("raw résumé bytes cannot survive into another user's session", async () => {
  installStorage();
  const cs = await CS();
  const store = await import("@/lib/application/resumeFileStore");
  cs.setCurrentUserId("userA");
  store.saveResumeFile({ name: "cv.pdf", type: "application/pdf", bytes: new Uint8Array([1, 2, 3, 4]) });
  assert.ok(store.readResumeFile(), "A can read its own bytes");
  cs.setCurrentUserId("userB");
  assert.equal(store.readResumeFile(), null, "B cannot read A's résumé bytes");
});

// ── LOGOUT (live path, source-verified) ──────────────────────────────────────

test("every logout path clears CareerAI sensitive state before signOut", () => {
  const dash = read("../src/app/components/dashboard/DashboardClient.tsx");
  const navbar = read("../src/app/components/Navbar.tsx");
  for (const [name, src] of [["dashboard", dash], ["navbar", navbar]] as const) {
    const i = src.indexOf("clearCareerAISensitive(");
    const j = src.indexOf("supabase.auth.signOut()");
    assert.ok(i !== -1, `${name} logout clears sensitive state`);
    assert.ok(j !== -1 && i < j, `${name} clears BEFORE signOut`);
  }
});

test("the SIGNED_OUT auth listener clears sensitive state and resets current user", () => {
  const sb = read("../src/lib/supabase.ts");
  assert.ok(/SIGNED_OUT/.test(sb) && /clearCareerAISensitive\(/.test(sb), "clears on SIGNED_OUT");
  assert.ok(/setCurrentUserId\(null\)/.test(sb), "resets current user on sign-out");
  assert.ok(/purgeLegacyUnscopedSensitiveKeys\(\)/.test(sb), "purges legacy keys on boot");
});

// ── ACCOUNT SWITCH ────────────────────────────────────────────────────────────

test("auth listener clears the previous user on an A→B in-place switch", () => {
  const sb = read("../src/lib/supabase.ts");
  assert.ok(/previousUserId && previousUserId !== nextUserId/.test(sb), "detects account switch");
  assert.ok(/clearCareerAISensitive\(previousUserId\)/.test(sb), "clears previous user on switch");
});

test("dashboard resets cached cards on auth transition and guards stale async", () => {
  const dash = read("../src/app/components/dashboard/DashboardClient.tsx");
  assert.ok(/onAuthStateChange/.test(dash), "dashboard subscribes to auth transitions");
  assert.ok(/latestUidRef/.test(dash), "stamps the authoritative load identity");
  assert.ok(/if \(latestUidRef\.current !== uid\) return;/.test(dash), "drops stale A results before applying");
  assert.ok(/setResumes\(\[\]\)/.test(dash) && /setJobMatches\(\[\]\)/.test(dash), "clears cards on transition");
});

// ── URL PRIVACY ───────────────────────────────────────────────────────────────

test("no sensitive content is placed in URLs/query strings (only ?id=<uuid>)", () => {
  const files = [
    "../src/app/components/dashboard/SavedCoverLetters.tsx",
    "../src/app/components/dashboard/SavedResumes.tsx",
    "../src/app/components/dashboard/SavedTranslations.tsx",
    "../src/app/components/dashboard/InterviewWidget.tsx",
    "../src/app/components/dashboard/RoadmapWidget.tsx",
    "../src/app/components/job-match/JobMatchClient.tsx",
  ];
  for (const f of files) {
    const src = read(f);
    assert.ok(!/[?&](resume|jobDescription|cover|answer|translation|text|body)=/.test(src), `${f}: no sensitive query param`);
  }
});

// ── LOGGING PRIVACY ───────────────────────────────────────────────────────────

test("touched code never logs tokens / sessions / résumé content", () => {
  const sb = read("../src/lib/supabase.ts");
  assert.ok(!/access_token/.test(sb) || !/console\.[a-z]+\([^)]*access_token/.test(sb), "no token logging");
  // Dashboard STEP-6 diagnostic log is dev-gated, not unconditional in prod.
  const dash = read("../src/app/components/dashboard/DashboardClient.tsx");
  const step6 = dash.indexOf("STEP 6 dashboard displaying runId");
  const before = dash.slice(Math.max(0, step6 - 220), step6);
  assert.ok(/NODE_ENV !== "production"/.test(before), "STEP 6 log is dev-gated");
});

// ── HEADERS / CSP / CACHE ─────────────────────────────────────────────────────

test("production security headers are configured in next.config", () => {
  const cfg = read("../next.config.ts");
  for (const h of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(cfg.includes(h), `header ${h} configured`);
  }
  assert.ok(cfg.includes('async headers()'), "headers() hook present");
});

test("CSP is meaningful (no wildcard default-src), and prod has no unsafe-eval", () => {
  const cfg = read("../next.config.ts");
  assert.ok(/default-src 'self'/.test(cfg), "default-src is 'self', not *");
  assert.ok(!/default-src \*/.test(cfg), "no wildcard default-src");
  assert.ok(/frame-ancestors 'none'/.test(cfg), "clickjacking protection");
  // unsafe-eval only guarded to development.
  assert.ok(/isProd \? "" : " 'unsafe-eval'"/.test(cfg), "unsafe-eval is dev-only");
});

test("authenticated API responses are marked no-store", () => {
  const cfg = read("../next.config.ts");
  assert.ok(/source: "\/api\/:path\*"/.test(cfg), "api path rule present");
  assert.ok(/no-store/.test(cfg), "Cache-Control no-store applied to API");
});

// ── XSS / SAFE LINKS ──────────────────────────────────────────────────────────

test("no dangerouslySetInnerHTML on live surfaces; safeHref remains authoritative", () => {
  const files = [
    "../src/app/components/job-match/JobMatchResults.tsx",
    "../src/app/components/ai-workflow/WorkflowResults.tsx",
    "../src/app/components/apply/ApplyPreviewClient.tsx",
    "../src/app/components/dashboard/JobMatchesWidget.tsx",
  ];
  for (const f of files) {
    const src = read(f);
    assert.ok(!/dangerouslySetInnerHTML/.test(src), `${f}: no raw HTML injection`);
  }
  // External URLs still routed through safeHref.
  assert.ok(read("../src/app/components/job-match/JobMatchResults.tsx").includes("safeHref"), "safeHref used for provider links");
});
