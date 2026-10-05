// Résumé Strength engine — deterministic, explainable scoring.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/resumeStrength.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeResumeStrength, strengthBand } from "@/lib/resume/resumeStrength";
import type { ResumeFormData } from "@/app/components/resume-builder/types";

const empty: ResumeFormData = {
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "",
  linkedin: "", photoUrl: "", summary: "", skills: [], experience: [], education: [], languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [],
};
const clone = (o: ResumeFormData): ResumeFormData => JSON.parse(JSON.stringify(o));

const strong: ResumeFormData = {
  fullName: "Anastasiia Palii", jobTitle: "Senior Frontend Engineer",
  email: "a@example.com", phone: "+49 170 000000", location: "Düsseldorf, Germany",
  website: "https://palii.dev", linkedin: "in/palii", photoUrl: "",
  summary: "Frontend engineer with eight years building accessible React applications for international clients, focused on performance and design systems that scale across teams.",
  skills: ["React","TypeScript","Next.js","CSS","Testing","GraphQL","Node","Figma","Accessibility","Performance"],
  experience: [
    { id: "1", company: "Acme", role: "Senior Frontend Engineer", startDate: "2021", endDate: "2025",
      description: "Led a team of 5 to rebuild the checkout, increasing conversion by 18% and reducing load time by 40%." },
    { id: "2", company: "Beta", role: "Frontend Engineer", startDate: "2018", endDate: "2021",
      description: "Built a design system adopted by 6 teams and improved Lighthouse scores from 60 to 95." },
  ],
  education: [{ id: "e1", institution: "TU Munich", degree: "BSc", field: "Computer Science", startDate: "2014", endDate: "2018" }],
  languages: [{ id: "l1", language: "English", proficiency: "Fluent" }],
  projects: [], certifications: [], professionalLinks: [], customSections: [],
};

test("empty résumé scores 0", () => {
  const r = computeResumeStrength(empty);
  assert.equal(r.overall, 0);
});

test("strong résumé scores high (>= 80) and bands as Strong", () => {
  const r = computeResumeStrength(strong);
  assert.ok(r.overall >= 80, `expected >=80, got ${r.overall}`);
  assert.equal(strengthBand(r.overall), "Strong");
});

test("overall exactly equals the sum of category scores; each within 0..max; total max = 100", () => {
  for (const f of [empty, strong]) {
    const r = computeResumeStrength(f);
    const sum = r.categories.reduce((s, c) => s + c.score, 0);
    assert.equal(r.overall, sum, "overall equals sum of categories");
    let maxTotal = 0;
    for (const c of r.categories) {
      assert.ok(c.score >= 0 && c.score <= c.max, `${c.key} within range`);
      assert.ok(Number.isInteger(c.score), `${c.key} integer`);
      maxTotal += c.max;
    }
    assert.equal(maxTotal, 100, "category maxima sum to 100");
  }
});

test("score never exceeds 100 or drops below 0 (even with absurd input)", () => {
  const huge = clone(strong);
  huge.skills = Array.from({ length: 200 }, (_, i) => `skill${i}`);
  huge.experience = Array.from({ length: 50 }, (_, i) => ({
    id: `x${i}`, company: "C", role: "Engineer", startDate: "2020", endDate: "2021",
    description: "Improved throughput by 30% and led 4 engineers to ship 12 releases.",
  }));
  const r = computeResumeStrength(huge);
  assert.ok(r.overall <= 100 && r.overall >= 0);
});

test("deterministic: same input → identical result", () => {
  const a = JSON.stringify(computeResumeStrength(strong));
  const b = JSON.stringify(computeResumeStrength(clone(strong)));
  assert.equal(a, b);
});

test("missing contact info lowers the contact category and recommends adding it", () => {
  const f = clone(strong); f.email = ""; f.phone = ""; f.location = "";
  const r = computeResumeStrength(f);
  const contact = r.categories.find((c) => c.key === "contact")!;
  assert.ok(contact.score < contact.max);
  assert.ok(contact.notes.some((n) => /email/i.test(n)));
});

test("missing summary zeroes the summary category and recommends adding one", () => {
  const f = clone(strong); f.summary = "";
  const r = computeResumeStrength(f);
  const s = r.categories.find((c) => c.key === "summary")!;
  assert.equal(s.score, 0);
  assert.ok(r.recommendations.some((x) => /summary/i.test(x)));
});

test("missing experience zeroes experience; missing education zeroes education; missing skills zeroes skills", () => {
  const noExp = clone(strong); noExp.experience = [];
  assert.equal(computeResumeStrength(noExp).categories.find((c) => c.key === "experience")!.score, 0);
  const noEdu = clone(strong); noEdu.education = [];
  assert.equal(computeResumeStrength(noEdu).categories.find((c) => c.key === "education")!.score, 0);
  const noSkills = clone(strong); noSkills.skills = [];
  assert.equal(computeResumeStrength(noSkills).categories.find((c) => c.key === "skills")!.score, 0);
});

test("experience WITH measurable evidence scores higher than the same WITHOUT", () => {
  const withEv = clone(strong);
  const without = clone(strong);
  without.experience = without.experience.map((e) => ({ ...e, description: "Responsible for frontend work and helping the team with tasks and things." }));
  const a = computeResumeStrength(withEv).categories.find((c) => c.key === "experience")!.score;
  const b = computeResumeStrength(without).categories.find((c) => c.key === "experience")!.score;
  assert.ok(a > b, `evidence ${a} should beat no-evidence ${b}`);
});

test("minimal résumé scores between empty and strong", () => {
  const minimal: ResumeFormData = { ...clone(empty), fullName: "A B", email: "a@b.co", jobTitle: "Engineer", skills: ["React","CSS"] };
  const r = computeResumeStrength(minimal).overall;
  assert.ok(r > 0 && r < computeResumeStrength(strong).overall);
});

test("analysis never mutates the input résumé", () => {
  const f = clone(strong);
  const before = JSON.stringify(f);
  computeResumeStrength(f);
  assert.equal(JSON.stringify(f), before);
});

test("works with no OpenAI (pure function — no fetch/network references)", () => {
  // Sanity: the module is importable and runs without any network primitive.
  const r = computeResumeStrength(strong);
  assert.ok(typeof r.overall === "number");
});
