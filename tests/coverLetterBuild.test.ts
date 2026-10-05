// Behavioral tests for the canonical cover-letter builder (Cover Letter Step 3).
// Pure/deterministic; no network. Never emits fake placeholders.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/coverLetterBuild.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFullLetter } from "@/lib/coverLetter/buildLetter";

const FULL = {
  fullName: "Anastasiia Palii",
  email: "anastasia@example.com",
  phone: "+49 151 23456789",
  location: "Düsseldorf",
  jobTitle: "Frontend Developer",
  company: "Boho Padel",
};
const BODY = "I am excited about this role.\n\nMy experience in React fits your needs.";

test("full letter includes identity, recipient, subject, salutation, body and signature", () => {
  const out = buildFullLetter(FULL, BODY);
  assert.ok(out.includes("Anastasiia Palii"), "name in heading");
  assert.ok(out.includes("Frontend Developer"), "role");
  assert.ok(out.includes("anastasia@example.com · +49 151 23456789 · Düsseldorf"), "contacts joined");
  assert.ok(out.includes("Hiring Team"), "recipient");
  assert.ok(out.includes("Boho Padel"), "company");
  assert.ok(out.includes("Re: Application for Frontend Developer — Boho Padel"), "subject");
  assert.ok(out.includes("Dear Hiring Team,"), "salutation");
  assert.ok(out.includes(BODY.split("\n\n")[0]) && out.includes(BODY.split("\n\n")[1]), "body preserved");
  assert.ok(/Sincerely,\nAnastasiia Palii\s*$/.test(out), "signs off with the real name");
});

test("blank optional fields are omitted — no placeholders, no 'undefined'", () => {
  const out = buildFullLetter({ fullName: "", email: "", phone: "", location: "", jobTitle: "", company: "" }, BODY);
  assert.ok(!/undefined|null|\[.*?\]/.test(out), "no undefined/null/bracket placeholders");
  assert.ok(!/ · /.test(out), "no dangling contact separators");
  assert.ok(out.includes("Hiring Team"), "still addressed to the Hiring Team");
  assert.ok(out.trim().endsWith("Sincerely,"), "closing has no fabricated name");
  assert.ok(out.includes(BODY.split("\n\n")[0]), "body still present");
});

test("reopened-style letter (company/role only, no identity) stays truthful", () => {
  const out = buildFullLetter(
    { fullName: "", email: "", phone: "", location: "", jobTitle: "Designer", company: "Acme" },
    "Body text here."
  );
  assert.ok(!out.includes("Anastasiia") && !/\n.*@.*\n/.test(out), "no identity lines");
  assert.ok(out.includes("Re: Application for Designer — Acme"), "subject from stored company/role");
  assert.ok(out.includes("Body text here."), "body present");
  assert.ok(out.trim().endsWith("Sincerely,"), "no name signature");
});

test("never contains any sample/fake identity", () => {
  const out = buildFullLetter(FULL, BODY);
  for (const fake of ["alex.chen", "555-0182", "San Francisco, CA", "Your Name", "[Company]", "[Your Name]"]) {
    assert.ok(!out.includes(fake), `must not contain ${fake}`);
  }
});

test("empty body does not throw and omits the body block", () => {
  const out = buildFullLetter(FULL, "");
  assert.ok(out.includes("Anastasiia Palii") && out.includes("Dear Hiring Team,"), "structure intact");
  assert.ok(/Sincerely,\nAnastasiia Palii\s*$/.test(out), "closing intact");
});
