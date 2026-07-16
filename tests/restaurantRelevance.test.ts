// Focused tests for the restaurant/hospitality classifier fix (German compounds
// + evidence-gated adjacency) and the exact-first / strong-adjacent-fallback
// behaviour. Pure logic — no network, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/restaurantRelevance.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { classifyJobDomain, decodeEntities, deriveSearchIntent, explainJobDomain, selectDomainMatches } from "@/lib/jobs/relevance";
import type { NormalizedJob } from "@/lib/jobs/types";

const intent = deriveSearchIntent(
  { profession: "Restaurant Manager", detectedSkills: ["service", "team leadership"] } as Parameters<typeof deriveSearchIntent>[0],
  "Restaurant Manager"
);
const job = (title: string, description = ""): NormalizedJob => ({
  externalId: title, provider: "jooble", title, company: "C", location: null, remote: false,
  description, tags: [], jobTypes: [], publishedAt: null, sourceUrl: "https://x/1", applyUrl: "https://x/1",
});
const C = (title: string, description = "") => classifyJobDomain(job(title, description), intent);

// ── exact titles (EN + German compounds) ──────────────────────────────────────
test("Restaurant Manager → exact", () => assert.equal(C("Restaurant Manager"), "exact"));
test("Restaurantleiter / Restaurantleitung → exact (German compound)", () => {
  assert.equal(C("Restaurantleiter (m/w/d)"), "exact");
  assert.equal(C("Stellvertretende Restaurantleitung"), "exact");
});
test("Gastronomieleiter / Gastronomiemanager → exact", () => {
  assert.equal(C("Gastronomieleiter"), "exact");
  assert.equal(C("Gastronomiemanager"), "exact");
});
test("Betriebsleiter Gastronomie → exact", () => assert.equal(C("Betriebsleiter Gastronomie"), "exact"));
test("F&B Manager / Food and Beverage Manager → exact", () => {
  assert.equal(C("F&B Manager"), "exact");
  assert.equal(C("Food and Beverage Manager"), "exact");
});
test("Hospitality Manager → exact", () => assert.equal(C("Hospitality Manager"), "exact"));
test("General Manager Restaurant / Hotel Restaurant Manager → exact", () => {
  assert.equal(C("General Manager Restaurant"), "exact");
  assert.equal(C("Hotel Restaurant Manager"), "exact");
});
test("Assistant Restaurant Manager → exact (or strong adjacent)", () => {
  assert.ok(["exact", "adjacent"].includes(C("Assistant Restaurant Manager")));
});
test("Serviceleiter / Küchenleiter → exact WITH hospitality evidence", () => {
  assert.equal(C("Serviceleiter", "Lead the restaurant service team."), "exact");
  assert.equal(C("Küchenleiter", "Kitchen brigade in our hotel restaurant."), "exact");
  // no hospitality evidence → not exact
  assert.notEqual(C("Serviceleiter", "Manage the car service department."), "exact");
});

// ── adjacency requires explicit hospitality evidence ──────────────────────────
test("Operations Manager + restaurant evidence → adjacent", () => {
  assert.equal(C("Operations Manager", "Oversee restaurant operations across 5 sites."), "adjacent");
});
test("Shift Manager + food & beverage evidence → adjacent", () => {
  assert.equal(C("Shift Manager", "Run the food & beverage floor."), "adjacent");
});

// ── generic terms alone never qualify ─────────────────────────────────────────
test("Inventory Manager without hospitality evidence → rejected", () => {
  assert.equal(C("Inventory Manager", "Warehouse stock control and logistics."), "rejected");
});
test("Automotive / Financial / Contract Manager → rejected", () => {
  assert.equal(C("Automotive Manager", "Car dealership operations."), "rejected");
  assert.equal(C("Financial Manager", "Budgets and forecasting."), "rejected");
  assert.equal(C("Contract Manager", "Draft and negotiate contracts."), "rejected");
  assert.equal(C("Operations Manager", "Logistics fleet management."), "rejected"); // operations WITHOUT hospitality
});

// ── exact-first + strong adjacent fallback only when no exact survives ─────────
const m = (id: string, matchScore: number) => ({ externalId: id, matchScore });
test("exact ranks before adjacent; adjacent fallback only when no exact", () => {
  // with an exact match, sub-40 adjacent is dropped
  const withExact = selectDomainMatches([m("ex", 42), m("adj", 37)], new Set(["ex"]), { adjacentFallback: 35 });
  assert.deepEqual(withExact.map((x) => x.externalId), ["ex"]);
  // no exact → strong adjacent (>=35) surfaces
  const noExact = selectDomainMatches([m("adj1", 50), m("adj2", 36), m("adj3", 30)], new Set(), { adjacentFallback: 35 });
  assert.deepEqual(noExact.map((x) => x.externalId), ["adj1", "adj2"]);
});

// ── HTML-entity normalization (real Jooble titles carry &amp; etc.) ───────────
test("decodeEntities decodes named + numeric entities, leaves plain text", () => {
  assert.equal(decodeEntities("F&amp;B Manager"), "F&B Manager");
  assert.equal(decodeEntities("Bar &amp; Restaurant"), "Bar & Restaurant");
  assert.equal(decodeEntities("caf&#233;"), "café");
  assert.equal(decodeEntities("Chef &#x2013; Vollzeit").includes("–"), true);
  assert.equal(decodeEntities("plain title"), "plain title");
});
test("F&amp;B / Food &amp; Beverage Manager (HTML-entity titles) → exact", () => {
  assert.equal(C("F&amp;B Manager (m/w/d)"), "exact");
  assert.equal(C("Food &amp; Beverage Manager (m/w/d)"), "exact");
  assert.equal(C("Bar &amp; Restaurant Supervisor"), "exact"); // "restaurant" stem after decode
});

// ── explainJobDomain — family resolution is the live root-cause lever ──────────
test("explainJobDomain reports the restaurant family + matched stem for a real title", () => {
  const ex = explainJobDomain(job("Restaurantleitung (m/w/d)"), intent);
  assert.equal(ex.family, "restaurant");
  assert.equal(ex.kind, "exact");
  assert.ok(ex.matched.includes("restaurant"));
});
test("a NON-restaurant profession collapses to the generic family and rejects real restaurant titles", () => {
  // Reproduces the live 0/0/N wipeout: when the résumé profession isn't
  // hospitality, familyOf → "generic" and restaurant titles are rejected.
  const generic = { profession: "Manager", requiredDomainTerms: [] as string[] };
  for (const t of ["Restaurantleiter (m/w/d)", "Gastronomieleiter", "F&amp;B Manager", "Hospitality Manager"]) {
    const ex = explainJobDomain(job(t), generic);
    assert.equal(ex.family, "generic");
    assert.equal(ex.kind, "rejected");
  }
});
test("classifyJobDomain never diverges from explainJobDomain(...).kind", () => {
  for (const t of ["Restaurant Manager", "Gastronomieleiter", "F&amp;B Manager", "Operations Manager", "Automotive Manager", "IT Support"]) {
    const j = job(t, "restaurant operations");
    assert.equal(classifyJobDomain(j, intent), explainJobDomain(j, intent).kind);
  }
});

// ── PHASE 9 — neutral provider availability note ──────────────────────────────
test("job cards show a neutral provider-availability note near View & apply", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/app/components/ai-workflow/WorkflowResults.tsx", import.meta.url)), "utf8");
  assert.ok(/Availability and application options are controlled by the external provider/.test(src));
  assert.ok(/View &amp; apply/.test(src), "the external View & apply link is preserved");
});
