// Behavioral tests for client-side candidate identity extraction (Cover Letter
// Step 2). Pure; no network. Never fabricates missing values.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/coverLetterIdentity.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCandidateIdentity, EMPTY_IDENTITY } from "@/lib/coverLetter/identity";

test("extracts email, phone, name and location from a typical résumé header", () => {
  const resume = [
    "Anastasiia Palii",
    "Frontend Developer",
    "anastasia@example.com · +49 151 23456789 · Düsseldorf, Germany",
    "",
    "EXPERIENCE",
    "Built web apps with React and TypeScript.",
  ].join("\n");
  const id = extractCandidateIdentity(resume);
  assert.equal(id.email, "anastasia@example.com");
  assert.ok(id.phone.replace(/\D/g, "").length >= 9, "phone captured");
  assert.equal(id.fullName, "Anastasiia Palii");
  assert.equal(id.location, "Düsseldorf");
});

test("missing identity stays EMPTY — never fabricated", () => {
  const id = extractCandidateIdentity("Experienced professional seeking new opportunities.");
  assert.equal(id.email, "");
  assert.equal(id.phone, "");
  assert.equal(id.location, "");
  // No 2–4 word name-looking first line here, so name stays empty.
  assert.equal(id.fullName, "");
});

test("empty / whitespace input yields the empty identity", () => {
  assert.deepEqual(extractCandidateIdentity(""), EMPTY_IDENTITY);
  assert.deepEqual(extractCandidateIdentity("   \n  "), EMPTY_IDENTITY);
});

test("a year range is NOT mistaken for a phone number", () => {
  const id = extractCandidateIdentity("Senior Engineer\nWorked 2019 - 2023 on platform teams.");
  assert.equal(id.phone, "");
});

test("a section heading / title line is not treated as a name", () => {
  const id = extractCandidateIdentity("PROFESSIONAL SUMMARY\nDetail-oriented engineer with 8 years of experience.");
  assert.equal(id.fullName, "");
});
