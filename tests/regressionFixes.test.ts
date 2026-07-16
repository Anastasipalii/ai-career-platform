// Tests for the four regression fixes: no auto-location prefill, empty-location
// = global (no rejection), restaurant/medical domain classification, and the
// DB sanitizer (22P05). Pure logic — no network, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/regressionFixes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { sanitizeDbString, sanitizeForDb } from "@/lib/dbSafe";
import { isLocationActive, evaluateJobLocation } from "@/lib/jobs/location";
import { classifyJobDomain, deriveSearchIntent } from "@/lib/jobs/relevance";
import type { NormalizedJob } from "@/lib/jobs/types";

const NUL = String.fromCharCode(0);
const BELL = String.fromCharCode(7);
const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");
const job = (o: Partial<NormalizedJob> = {}): NormalizedJob => ({
  externalId: "j", provider: "jooble", title: "Role", company: "C", location: null, remote: false,
  description: "", tags: [], jobTypes: [], publishedAt: null, sourceUrl: "https://x/1", applyUrl: "https://x/1", ...o,
});
const intentFor = (profession: string, skills: string[] = []) =>
  deriveSearchIntent({ profession, detectedSkills: skills } as Parameters<typeof deriveSearchIntent>[0], profession);

// ── PHASE 1 — prefill removed ─────────────────────────────────────────────────
test("WorkflowCanvas no longer auto-prefills location from the résumé", () => {
  const wc = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  assert.ok(!/extractResumeLocation/.test(wc), "résumé-location extraction must not be used in the workflow UI");
  assert.ok(!/prefsTouched/.test(wc), "the prefill effect must be gone");
});

test("isLocationActive is false when City and Country are empty (→ global search)", () => {
  assert.equal(isLocationActive({}), false);
  assert.equal(isLocationActive({ city: "", country: "" }), false);
  assert.equal(isLocationActive({ city: " ", country: "  " }), false);
  assert.equal(isLocationActive({ country: "DE" }), true);
  assert.equal(isLocationActive({ city: "Düsseldorf" }), true);
});

test("empty location: an on-site job with no country pref is NOT rejected by region", () => {
  const d = evaluateJobLocation(job({ title: "Nurse", location: "Somewhere" }), {});
  assert.equal(d.keep, true);
});

// ── PHASE 2 — restaurant + medical classification ─────────────────────────────
test("Restaurant Manager profile accepts real titles (EN + DE) as exact", () => {
  const intent = intentFor("Restaurant Manager", ["service"]);
  for (const t of ["Restaurant Manager", "Restaurantleiter (m/w/d)", "Gastronomy Manager", "Hospitality Manager", "Food & Beverage Manager"]) {
    assert.equal(classifyJobDomain(job({ title: t }), intent), "exact", `${t} should be exact`);
  }
  assert.equal(classifyJobDomain(job({ title: "Assistant Restaurant Manager" }), intent), "exact");
  assert.equal(classifyJobDomain(job({ title: "Shift Manager", description: "Lead the restaurant floor team." }), intent), "adjacent");
  assert.equal(classifyJobDomain(job({ title: "Shift Manager", description: "Warehouse logistics." }), intent), "rejected");
  assert.equal(classifyJobDomain(job({ title: "Software Engineer" }), intent), "rejected");
});

test("Medical profile accepts relevant medical roles (EN + DE) and rejects unrelated", () => {
  const intent = intentFor("Medical Assistant", ["patient care"]);
  for (const t of ["Medical Assistant", "Medizinische Fachangestellte (MFA)", "Krankenschwester", "Healthcare Support Worker", "Medical Office Coordinator"]) {
    assert.equal(classifyJobDomain(job({ title: t }), intent), "exact", `${t} should be exact`);
  }
  assert.equal(classifyJobDomain(job({ title: "IT Support Specialist" }), intent), "rejected");
});

test("frontend + legal families still behave (no regression)", () => {
  assert.equal(classifyJobDomain(job({ title: "React Engineer" }), intentFor("Frontend Developer", ["React"])), "exact");
  assert.equal(classifyJobDomain(job({ title: "Software Engineer", description: "Java backend." }), intentFor("Frontend Developer")), "rejected");
  assert.equal(classifyJobDomain(job({ title: "Legal Counsel" }), intentFor("Legal Consultant")), "exact");
  assert.equal(classifyJobDomain(job({ title: "IT Support Specialist 2nd Level" }), intentFor("Legal Consultant")), "rejected");
  assert.equal(classifyJobDomain(job({ title: "KYC Analyst" }), intentFor("Legal Consultant")), "adjacent");
});

// ── PHASE 3 — DB sanitizer (22P05) ────────────────────────────────────────────
test("sanitizeDbString strips NUL + control chars but keeps umlauts/accents", () => {
  const s = `Rechtsanwältin${NUL} M${BELL}üller café\tstraße`;
  const c = sanitizeDbString(s);
  assert.ok(!c.includes(NUL), "NUL removed");
  assert.ok(!c.includes(BELL), "control char removed");
  assert.ok(c.includes("\t"), "tab preserved");
  assert.ok(c.includes("ä") && c.includes("ü") && c.includes("ß") && c.includes("é"), "ä ü ß é preserved");
  assert.ok(c.includes("Rechtsanwältin") && c.includes("straße"), "text intact");
});

test("sanitizeDbString drops unpaired surrogates but keeps valid pairs (emoji)", () => {
  assert.equal(sanitizeDbString("A\uD834B"), "AB"); // lone high surrogate removed
  assert.equal(sanitizeDbString("A\uDE00B"), "AB"); // lone low surrogate removed
  assert.equal(sanitizeDbString("A😀B"), "A😀B"); // valid emoji kept
});

test("sanitizeForDb deep-cleans nested objects/arrays; leaves non-strings", () => {
  const out = sanitizeForDb({ a: `x${NUL}y`, b: [`p${NUL}`, 5, true, null], c: { d: `Müller${NUL}` }, n: 42 }) as {
    a: string; b: (string | number | boolean | null)[]; c: { d: string }; n: number;
  };
  assert.equal(out.a, "xy");
  assert.deepEqual(out.b, ["p", 5, true, null]);
  assert.equal(out.c.d, "Müller");
  assert.equal(out.n, 42);
});

test("workflowRun persistence sanitizes payloads before writing", () => {
  const wr = readCode("../src/lib/workflowRun.ts");
  assert.ok(/import\s+\{\s*sanitizeForDb\s*\}/.test(wr));
  assert.ok(/\.upsert\(\s*sanitizeForDb\(/.test(wr), "upsert payload sanitized");
  assert.ok(/\.insert\(sanitizeForDb\(/.test(wr), "event insert sanitized");
  assert.ok(/\.update\(sanitizeForDb\(patch\)\)/.test(wr), "update patch sanitized");
});

test("admin check is memoized per user (stops repeated app_admins 404s)", () => {
  const aa = readCode("../src/lib/simulation/adminAccess.ts");
  assert.ok(/_adminCache/.test(aa) && /\.has\(userId\)/.test(aa), "app_admins result cached per user");
});
