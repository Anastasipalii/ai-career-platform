// Tests for location-aware search + exact/adjacent domain classification +
// résumé location extraction. Pure logic — no network, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/jobsRelevanceLocation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateJobLocation, resolveCountry, jobWorkMode, parseRemoteRestrictions, providerLocationString,
  type SearchLocationPrefs,
} from "@/lib/jobs/location";
import { classifyJobDomain, deriveSearchIntent } from "@/lib/jobs/relevance";
import { extractResumeLocation } from "@/lib/resume/extractLocation";
import type { NormalizedJob } from "@/lib/jobs/types";

const job = (o: Partial<NormalizedJob> = {}): NormalizedJob => ({
  externalId: "j-1", provider: "jooble", title: "Role", company: "C", location: null, remote: false,
  description: "", tags: [], jobTypes: [], publishedAt: null, sourceUrl: "https://x/1", applyUrl: "https://x/1", ...o,
});
const DUS: SearchLocationPrefs = { city: "Düsseldorf", country: "DE", radiusKm: 100, remoteWorldwide: false };
const intentFor = (profession: string, skills: string[] = []) =>
  deriveSearchIntent({ profession, detectedSkills: skills } as Parameters<typeof deriveSearchIntent>[0], profession);

// ── PART 1 / 1A — location ────────────────────────────────────────────────────
test("1. Düsseldorf + 100km rejects New Bremen, Ohio (on-site, US)", () => {
  const d = evaluateJobLocation(job({ title: "Medical Assistant", location: "New Bremen, OH" }), DUS);
  assert.equal(d.keep, false);
  assert.equal(d.mode, "onsite");
});

test("2. Düsseldorf + remote-allowed keeps a clearly remote global job", () => {
  const prefs = { ...DUS, remoteWorldwide: true };
  const d = evaluateJobLocation(job({ title: "Remote Frontend Developer", remote: true, location: "Remote" }), prefs, undefined, "Work from anywhere.");
  assert.equal(d.keep, true);
  assert.equal(d.mode, "remote");
});

test("3. Unknown-location non-remote job is rejected", () => {
  const d = evaluateJobLocation(job({ title: "Lawyer", location: null, remote: false }), DUS);
  assert.equal(d.keep, false);
  assert.equal(d.mode, "unknown");
});

test("4. Germany-only remote job is rejected for a US searcher", () => {
  const prefs: SearchLocationPrefs = { country: "US", remoteWorldwide: true };
  const d = evaluateJobLocation(job({ title: "Remote Engineer", remote: true }), prefs, undefined, "This role is Germany only.");
  assert.equal(d.keep, false);
  assert.match(d.reason, /restricted/);
});

test("5. worldwide remote job survives (remote allowed)", () => {
  const prefs = { ...DUS, remoteWorldwide: true };
  assert.equal(evaluateJobLocation(job({ title: "Remote Developer", remote: true }), prefs).keep, true);
});

test("6. on-site Cologne is accepted for Düsseldorf + 100km (same country)", () => {
  const d = evaluateJobLocation(job({ title: "Medical Assistant", location: "Cologne, Germany" }), DUS);
  assert.equal(d.keep, true);
  assert.equal(d.mode, "onsite");
});

test("remote-worldwide OFF limits remote jobs to the region", () => {
  const d = evaluateJobLocation(job({ title: "Remote Dev", remote: true, location: "Remote - US, OH" }), DUS);
  assert.equal(d.keep, false); // US remote, worldwide off, region DE
});

test("resolveCountry + helpers", () => {
  assert.equal(resolveCountry("New Bremen, OH"), "US");
  assert.equal(resolveCountry("Cologne, Germany"), "DE");
  assert.equal(resolveCountry("Köln"), "DE");
  assert.equal(resolveCountry(""), "");
  assert.equal(jobWorkMode(job({ remote: true })), "remote");
  assert.equal(jobWorkMode(job({ location: "Berlin" })), "onsite");
  assert.equal(jobWorkMode(job({})), "unknown");
  assert.equal(parseRemoteRestrictions("EU only").countries[0], "EU");
  assert.equal(providerLocationString(DUS), "Düsseldorf, Germany");
});

// ── PART 1A — résumé location extraction ──────────────────────────────────────
test("7. résumé location is extracted and prefills (German postal + city)", () => {
  const e = extractResumeLocation("Jane Doe\n40210 Düsseldorf\nExperienced nurse.");
  assert.equal(e.country, "DE");
  assert.match(e.city, /Düsseldorf/i);
  assert.ok(e.confidence >= 0.6);
});

test("City, Country pattern extracts with high confidence", () => {
  const e = extractResumeLocation("Contact: Cologne, Germany | email@x.com");
  assert.equal(e.country, "DE");
  assert.ok(e.confidence >= 0.8);
});

test("8. low/missing location is NOT invented", () => {
  const e = extractResumeLocation("Senior software developer with 8 years of experience.");
  assert.equal(e.city, "");
  assert.equal(e.confidence, 0);
});

test("9. the extracted value is data the user can override (empty stays empty)", () => {
  assert.equal(extractResumeLocation("").confidence, 0);
  assert.notEqual(extractResumeLocation("Based in München").city, extractResumeLocation("Based in Hamburg").city);
});

// ── PART 2 — frontend relevance ───────────────────────────────────────────────
test("4b. React Engineer passes frontend (exact)", () => {
  assert.equal(classifyJobDomain(job({ title: "React Engineer" }), intentFor("Frontend Developer", ["React"])), "exact");
});
test("Web Developer / UI Engineer / React Developer are exact frontend", () => {
  const intent = intentFor("Frontend Developer", ["React", "TypeScript"]);
  for (const t of ["Web Developer", "UI Engineer", "React Developer", "JavaScript Developer", "Frontend Software Engineer"]) {
    assert.equal(classifyJobDomain(job({ title: t }), intent), "exact", `${t} should be exact`);
  }
});
test("5. generic backend Software Engineer fails frontend", () => {
  assert.equal(
    classifyJobDomain(job({ title: "Software Engineer", description: "Java, Spring, PostgreSQL microservices." }), intentFor("Frontend Developer", ["React"])),
    "rejected"
  );
});
test("Software Engineer WITH frontend evidence is adjacent (not rejected, not exact)", () => {
  assert.equal(
    classifyJobDomain(job({ title: "Software Engineer", description: "Build our React + TypeScript frontend." }), intentFor("Frontend Developer", ["React"])),
    "adjacent"
  );
});

// ── PART 3 — legal relevance ──────────────────────────────────────────────────
test("6. IT Support Specialist fails legal", () => {
  assert.equal(classifyJobDomain(job({ title: "IT Support Specialist 2nd Level" }), intentFor("Legal Consultant")), "rejected");
});
test("7. Legal Counsel passes legal (exact)", () => {
  assert.equal(classifyJobDomain(job({ title: "Legal Counsel" }), intentFor("Legal Consultant")), "exact");
  assert.equal(classifyJobDomain(job({ title: "Rechtsanwalt (m/w/d)", tags: ["legal"] }), intentFor("Lawyer")), "exact");
});
test("8. KYC Analyst is adjacent legal/compliance (explicit evidence only)", () => {
  assert.equal(classifyJobDomain(job({ title: "KYC Analyst" }), intentFor("Legal Consultant")), "adjacent");
  // generic 'healthcare project management' must NOT be legal
  assert.equal(classifyJobDomain(job({ title: "Healthcare Project Manager", description: "data, systems, documentation" }), intentFor("Legal Consultant")), "rejected");
});

// ── PART 4 / PART 1 combined — medical near Düsseldorf ─────────────────────────
test("9b. Medical Assistant near Düsseldorf passes location + domain", () => {
  const j = job({ title: "Medical Assistant", location: "Düsseldorf, Germany" });
  assert.equal(evaluateJobLocation(j, DUS).keep, true);
  assert.equal(classifyJobDomain(j, intentFor("Medical Assistant", ["patient care"])), "exact");
});
