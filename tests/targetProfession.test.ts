// Tests for the user-controlled Target Profession as the source of truth for the
// job search (search intent + domain family + classification), while the résumé
// CandidateProfile keeps driving ranking/skills. Pure logic + PII-free source
// scans — no network, no DOM.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/targetProfession.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { classifyJobDomain, searchIntentForProfession } from "@/lib/jobs/relevance";
import { isLocationActive, evaluateJobLocation } from "@/lib/jobs/location";
import type { NormalizedJob } from "@/lib/jobs/types";

const job = (title: string, description = ""): NormalizedJob => ({
  externalId: title, provider: "jooble", title, company: "C", location: "Köln", remote: false,
  description, tags: [], jobTypes: [], publishedAt: null, sourceUrl: "https://x/1", applyUrl: "https://x/1",
});
// Build the classification intent the workflow uses: profession + required terms
// derived FROM THE TARGET PROFESSION (never the résumé).
const intentFor = (target: string) => {
  const si = searchIntentForProfession(target);
  return { profession: si.profession, requiredDomainTerms: si.requiredDomainTerms };
};
const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");

// ── req 12: résumé suggests Operations Manager, user enters Restaurant Manager ──
test("target Restaurant Manager searches restaurant jobs (résumé suggestion ignored)", () => {
  const target = intentFor("Restaurant Manager");
  assert.equal(classifyJobDomain(job("Restaurantleiter (m/w/d)"), target), "exact");
  assert.equal(classifyJobDomain(job("Gastronomieleiter"), target), "exact");
  // The résumé-suggested "Operations Manager" would NOT have matched these:
  const suggestion = intentFor("Operations Manager");
  assert.equal(classifyJobDomain(job("Restaurantleiter (m/w/d)"), suggestion), "rejected");
});

// ── req 12: résumé suggests Legal Consultant, user enters Compliance Officer ────
test("target Compliance Officer searches compliance/legal jobs", () => {
  const target = intentFor("Compliance Officer");
  assert.equal(classifyJobDomain(job("Compliance Officer (m/w/d)"), target), "exact");
  // Adjacent legal/compliance evidence still survives (never rejected).
  assert.notEqual(classifyJobDomain(job("Regulatory Compliance Manager", "AML/KYC"), target), "rejected");
});

// ── req 12: target overrides profile.profession ───────────────────────────────
test("user Target Profession overrides the résumé profession for classification", () => {
  // Even if the résumé profession were "Operations Manager", classification runs
  // against the target intent — proven by the divergent outcomes above.
  const target = intentFor("Restaurant Manager");
  assert.equal(classifyJobDomain(job("F&amp;B Manager"), target), "exact");
});

// ── req 12: providerQuery uses only the target role ───────────────────────────
test("providerQuery is exactly the concise target role; searchQuery starts with it", () => {
  const si = searchIntentForProfession("Restaurant Manager");
  assert.equal(si.providerQuery, "Restaurant Manager");
  assert.ok(si.searchQuery.toLowerCase().startsWith("restaurant manager"));
  // Arbeitnow query is target + a SMALL alias set (never a résumé-skill dump).
  assert.ok(si.searchQuery.split(/\s+/).length <= 14);
});

// ── req 12: unrelated jobs remain rejected ────────────────────────────────────
test("clearly unrelated jobs are still rejected under the target intent", () => {
  const target = intentFor("Restaurant Manager");
  for (const t of ["Automotive Manager", "Financial Manager", "Contract Manager", "IT Support Specialist"]) {
    assert.equal(classifyJobDomain(job(t, "unrelated"), target), "rejected", `${t} must be rejected`);
  }
});

// ── req 12: existing location/remote behavior unchanged ───────────────────────
test("targetProfession does not affect location activation or evaluation", () => {
  assert.equal(isLocationActive({ targetProfession: "Restaurant Manager" }), false);
  assert.equal(isLocationActive({ targetProfession: "X", country: "DE" }), true);
  const d = evaluateJobLocation(job("Restaurantleiter"), { targetProfession: "Restaurant Manager" });
  assert.equal(d.keep, true); // no city/country → global, not rejected
});

// ── req 12 (source scans): pipeline gating, ranking, persistence, preview ─────
test("empty Target Profession blocks the pipeline (gate + message + guard)", () => {
  const wc = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  assert.ok(/const canRun = Boolean\(\(searchPrefs\.targetProfession/.test(wc), "canRun derives from targetProfession");
  assert.ok(/disabled=\{running \|\| !canRun\}/.test(wc), "Run button disabled when !canRun");
  assert.ok(/if \(!canRun\) return;/.test(wc), "run() defensively returns when !canRun");
  assert.ok(/Please enter the profession or job title you want to search for\./.test(wc), "shows the required message");
});
test("résumé skills still drive ranking (agent still receives resumeText + analysis)", () => {
  const wc = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  assert.ok(/\/api\/job-match\/agent/.test(wc));
  assert.ok(/resumeText,\s*\n\s*jobDescription,/.test(wc), "resumeText passed to the ranker");
  assert.ok(/analysis: analysis \?\? undefined/.test(wc), "résumé analysis passed to the ranker");
});
test("providerQuery/searchQuery are target-driven in the workflow", () => {
  const wc = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  assert.ok(/searchIntentForProfession\(targetProfession\)/.test(wc));
  assert.ok(/const intent = \{ profession: targetProfession, requiredDomainTerms \}/.test(wc));
});
test("monitoring + results persist the target profession", () => {
  const wc = readCode("../src/app/components/ai-workflow/WorkflowCanvas.tsx");
  assert.ok(/targetProfession: meta\.targetProfession/.test(wc), "saveWorkflowResults persists target");
  assert.ok(/jobMatchRecord[\s\S]{0,220}targetProfession:/.test(wc), "job_match jsonb (monitoring) carries target");
  const wr = readCode("../src/lib/workflowResults.ts");
  assert.ok(/targetProfession\?: string/.test(wr), "WorkflowResults type has targetProfession");
});
test("application draft + preview carry the target profession", () => {
  const res = readCode("../src/app/components/ai-workflow/WorkflowResults.tsx");
  assert.ok(/targetProfession: persisted\?\.targetProfession/.test(res), "draft populated from persisted target");
  const prev = readCode("../src/app/components/apply/ApplyPreviewClient.tsx");
  assert.ok(/Target profession/.test(prev) && /draft\.targetProfession/.test(prev), "preview displays the target");
});
test("SearchPreferences renders the required field + non-binding suggestion", () => {
  const sp = readCode("../src/app/components/ai-workflow/SearchPreferences.tsx");
  assert.ok(/Target profession \/ job title/.test(sp), "field label present");
  assert.ok(/Suggested from your résumé:/.test(sp), "non-binding suggestion label present");
  assert.ok(/Use suggestion/.test(sp), "Use suggestion action present");
  assert.ok(/set\("targetProfession", e\.target\.value\)/.test(sp), "field is user-editable");
});
