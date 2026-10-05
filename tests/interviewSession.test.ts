// Behavioral tests for the pure interview session scoring/persistence helpers
// (Interview Coach Step 2). No network, no DOM.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/interviewSession.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateScore, buildSessionFeedback, buildStoredAnswers } from "@/lib/interview/session";
import type { SessionAnswer, AIQuestion, FeedbackData } from "@/app/components/interview-coach/types";

const q = (s: string): AIQuestion => ({ question: s, category: "Behavioral", tip: "t" });
const fb = (c: number, cf: number, st: number): FeedbackData => ({
  clarity: c, confidence: cf, structure: st, improvedAnswer: "better", keywords: ["k"], strengths: ["s"], mistakes: ["m"],
});
const scored = (text: string, f: FeedbackData): SessionAnswer => ({ question: q(text), answer: "ans", feedback: f });
const skipped = (text: string): SessionAnswer => ({ question: q(text), answer: "", feedback: null });

test("aggregate uses only genuinely scored answers", () => {
  const answers = [scored("a", fb(90, 90, 90)), skipped("b"), scored("c", fb(60, 60, 60))];
  // (90 + 60) / 2 = 75 — the skipped answer is NOT counted as 0.
  assert.equal(aggregateScore(answers), 75);
});

test("aggregate is null when nothing was scored (never 0)", () => {
  assert.equal(aggregateScore([skipped("a"), skipped("b")]), null);
  assert.equal(aggregateScore([]), null);
});

test("stored answers mark scored vs skipped truthfully", () => {
  const stored = buildStoredAnswers([scored("a", fb(80, 80, 80)), skipped("b")]);
  assert.equal(stored[0].scored, true);
  assert.deepEqual(stored[0].scores, { clarity: 80, confidence: 80, structure: 80 });
  assert.equal(stored[1].scored, false);
  assert.equal(stored[1].scores, undefined, "skipped answer carries no fabricated score");
});

test("session feedback blob reports scored/total and a null avg when unscored", () => {
  const blob = buildSessionFeedback([skipped("a"), skipped("b")], "quick");
  assert.equal(blob.avgScore, null);
  assert.equal(blob.scoredCount, 0);
  assert.equal(blob.totalCount, 2);
  assert.equal(blob.mode, "quick");
  assert.equal(blob.answers.length, 2);
});

test("mixed session can still finish and persist a truthful score", () => {
  const blob = buildSessionFeedback([scored("a", fb(70, 80, 90)), skipped("b")], "hr");
  assert.equal(blob.scoredCount, 1);
  assert.equal(blob.totalCount, 2);
  assert.equal(blob.avgScore, 80); // round((70+80+90)/3)=80
});
