// Tests for the route-filter fix, provider-balanced pool, exact/adjacent
// selection + recall fallback, and the complete country list. Pure logic.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/jobsRouteBalance.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { balancePool, combineProviderResults } from "@/lib/jobs/merge";
import { selectDomainMatches } from "@/lib/jobs/relevance";
import { COUNTRIES, resolveCountryFromText } from "@/lib/geo/countries";
import { resolveCountry } from "@/lib/jobs/location";
import type { NormalizedJob, JobProviderResult } from "@/lib/jobs/types";

const j = (provider: NormalizedJob["provider"], i: number, title = "Role"): NormalizedJob => ({
  externalId: `${provider}-${i}`, provider, title, company: `Co${i}`, location: "Berlin", remote: false,
  description: "", tags: [], jobTypes: [], publishedAt: null, sourceUrl: `https://${provider}/${i}`, applyUrl: `https://${provider}/${i}`,
});
const many = (provider: NormalizedJob["provider"], n: number, title = "Role") => Array.from({ length: n }, (_, i) => j(provider, i, title));
const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");

// ── PART 2 — provider-balanced pool ───────────────────────────────────────────
test("4. 100 Arbeitnow rows do not starve 20 Jooble rows", () => {
  const pool = balancePool([...many("arbeitnow", 100), ...many("jooble", 20)], 20);
  const arb = pool.filter((x) => x.provider === "arbeitnow").length;
  const joo = pool.filter((x) => x.provider === "jooble").length;
  assert.equal(joo, 20, "all 20 Jooble jobs survive");
  assert.equal(arb, 20, "Arbeitnow capped at 20");
  assert.equal(pool.length, 40);
});

test("5. a provider with unused capacity lets the other fill it", () => {
  const pool = balancePool([...many("arbeitnow", 100), ...many("jooble", 5)], 20);
  assert.equal(pool.filter((x) => x.provider === "jooble").length, 5);
  assert.equal(pool.filter((x) => x.provider === "arbeitnow").length, 35); // 20 + 15 unused-fill
  assert.equal(pool.length, 40);
});

test("balancePool is deterministic and interleaves provider-first order", () => {
  const pool = balancePool([...many("arbeitnow", 3), ...many("jooble", 3)], 20);
  assert.equal(pool[0].provider, "arbeitnow");
  assert.equal(pool[1].provider, "jooble");
  assert.deepEqual(balancePool([...many("arbeitnow", 3), ...many("jooble", 3)], 20).map((x) => x.externalId), pool.map((x) => x.externalId));
});

test("1/2. Jooble frontend results pass through (not re-filtered by the long query)", () => {
  // The route keeps Jooble as-is; balancing preserves all 20.
  const combined = combineProviderResults([
    { provider: "arbeitnow", result: { ok: true, jobs: many("arbeitnow", 100, "Software Engineer") } },
    { provider: "jooble", result: { ok: true, jobs: many("jooble", 20, "Frontend Developer") } },
  ]);
  const pool = balancePool(combined.jobs, 20);
  assert.equal(pool.filter((x) => x.provider === "jooble").length, 20);
});

test("14. provider failure handling unchanged (one fails → other survives)", () => {
  const fail = (): JobProviderResult => ({ ok: false, error: { code: "provider_timeout", message: "x" } });
  const c = combineProviderResults([
    { provider: "arbeitnow", result: fail() },
    { provider: "jooble", result: { ok: true, jobs: many("jooble", 3) } },
  ]);
  assert.equal(c.ok, true);
  assert.equal(balancePool(c.jobs, 20).length, 3);
  const both = combineProviderResults([{ provider: "arbeitnow", result: fail() }, { provider: "jooble", result: fail() }]);
  assert.equal(both.ok, false);
});

// ── PART 3 — exact-first + adjacent fallback ──────────────────────────────────
const m = (id: string, matchScore: number) => ({ externalId: id, matchScore });

test("10. exact jobs rank before adjacent jobs (regardless of score)", () => {
  const ranked = [m("adj1", 90), m("ex1", 45), m("adj2", 60), m("ex2", 41)];
  const out = selectDomainMatches(ranked, new Set(["ex1", "ex2"]));
  assert.deepEqual(out.map((x) => x.externalId), ["ex1", "ex2", "adj1", "adj2"]);
});

test("11. strong adjacent appears ONLY when no exact exists (fallback 35)", () => {
  // no exact → adjacent ≥40 then adjacent 35–40 surface
  const noExact = selectDomainMatches([m("a1", 50), m("a2", 37), m("a3", 30)], new Set(), { adjacentFallback: 35 });
  assert.deepEqual(noExact.map((x) => x.externalId), ["a1", "a2"]); // a3(30) excluded
  // exact present → fallback NOT applied (adjacent below 40 dropped)
  const withExact = selectDomainMatches([m("e1", 42), m("a1", 37)], new Set(["e1"]), { adjacentFallback: 35 });
  assert.deepEqual(withExact.map((x) => x.externalId), ["e1"]);
});

test("MIN_MATCH_SCORE 40 still enforced for exact matches", () => {
  assert.deepEqual(selectDomainMatches([m("e1", 39)], new Set(["e1"])).map((x) => x.externalId), []);
  assert.deepEqual(selectDomainMatches([m("e1", 40)], new Set(["e1"])).map((x) => x.externalId), ["e1"]);
});

// ── PART 4 — complete country list ────────────────────────────────────────────
test("12. the country list is complete (not just 5 countries)", () => {
  assert.ok(COUNTRIES.length >= 150, `expected the full ISO list, got ${COUNTRIES.length}`);
  const codes = new Set(COUNTRIES.map((c) => c.code));
  for (const code of ["DE", "US", "ES", "BR", "IN", "JP", "ZA", "NG", "AU"]) assert.ok(codes.has(code), `missing ${code}`);
});

test("country resolution works for any country name (not just the old handful)", () => {
  assert.equal(resolveCountryFromText("Madrid, Spain"), "ES");
  assert.equal(resolveCountryFromText("Toronto, Canada"), "CA");
  assert.equal(resolveCountry("São Paulo, Brazil"), "BR");
  assert.equal(resolveCountry("New Bremen, OH"), "US"); // sub-national heuristic preserved
  assert.equal(resolveCountry("Köln"), "DE");
});

// ── route source guarantees (the regression fix) ──────────────────────────────
test("route filters Arbeitnow by query but NOT Jooble, and drops the location contains filter", () => {
  const code = readCode("../src/app/api/jobs/search/route.ts");
  assert.ok(/arbeitnow\.jobs\.filter\(\(j\)\s*=>\s*matchesQuery/.test(code), "Arbeitnow keeps OR query filter");
  assert.ok(!/jooble\.jobs\.filter\(\(j\)\s*=>\s*matchesQuery/.test(code), "Jooble must NOT be re-filtered by the long query");
  assert.ok(!/contains\(j\.location,\s*location\)/.test(code), "route location-contains filter must be removed");
  assert.ok(/balancePool/.test(code), "route builds a balanced pool");
});
