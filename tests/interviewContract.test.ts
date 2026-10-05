// Source-scan contract tests for Interview Coach Step 2 hardening.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/interviewContract.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const FEEDBACK = read("../src/app/api/interview/feedback/route.ts");
const GENERATE = read("../src/app/api/interview/generate/route.ts");
const CLIENT   = read("../src/app/components/interview-coach/InterviewClient.tsx");
const PAGE     = read("../src/app/interview-coach/page.tsx");
const WIDGET   = read("../src/app/components/dashboard/InterviewWidget.tsx");

// ── Factual integrity ─────────────────────────────────────────────────────────
test("feedback prompt forbids inventing candidate facts in the improved answer", () => {
  assert.ok(/NEVER invent/i.test(FEEDBACK), "explicit no-invention rule present");
  for (const kw of ["employers", "achievements", "metrics", "certifications", "education", "technologies", "team sizes"]) {
    assert.ok(new RegExp(kw, "i").test(FEEDBACK), `no-invention rule covers ${kw}`);
  }
  assert.ok(/CANDIDATE'S OWN|candidate's own/i.test(FEEDBACK), "improved answer is grounded in the candidate's own answer");
  assert.ok(/keep the improved answer general/i.test(FEEDBACK), "stays general when evidence is lacking");
});

test("feedback response contract keys are preserved", () => {
  for (const key of ["clarity", "confidence", "structure", "improvedAnswer", "keywords", "strengths", "mistakes"]) {
    assert.ok(new RegExp(`"${key}"`).test(FEEDBACK), `contract key ${key} present`);
  }
});

// ── Validation / error safety ─────────────────────────────────────────────────
test("feedback route allow-lists type/language, caps inputs, hides raw errors", () => {
  assert.ok(/MODE_LABELS/.test(FEEDBACK) && /INTERVIEW_LANGUAGES/.test(FEEDBACK), "allow-lists interview type + language");
  assert.ok(/MAX_ANSWER/.test(FEEDBACK) && /MAX_QUESTION/.test(FEEDBACK) && /\.slice\(0,/.test(FEEDBACK), "caps question + answer size");
  assert.ok(/\b429\b/.test(FEEDBACK), "keeps friendly 429 handling");
  // Raw exception text must never be returned.
  for (const call of FEEDBACK.match(/errorJson\([^;]*?\)/g) || []) {
    assert.ok(!/\.message/.test(call), "no errorJson returns a raw exception message");
  }
});

test("generate route allow-lists language, caps job title, hides raw errors, no stale fallback claim", () => {
  assert.ok(/INTERVIEW_LANGUAGES/.test(GENERATE), "language allow-list");
  assert.ok(/safeJobTitle/.test(GENERATE) && /slice\(0, 120\)/.test(GENERATE), "caps job title");
  assert.ok(!/client builds local/.test(GENERATE), "stale 'local fallback' comment removed");
  assert.ok(!/error: msg \}/.test(GENERATE), "does not return raw err.message on 500");
});

// ── Resilient flow ────────────────────────────────────────────────────────────
test("failed feedback never traps the user — a skip path advances/finishes", () => {
  assert.ok(/handleSkip/.test(CLIENT), "skip handler exists");
  assert.ok(/advance\(null\)/.test(CLIENT), "skip advances with no score");
  assert.ok(/not scored/i.test(CLIENT), "skipped answers are labelled 'not scored'");
  // Skip is reachable whenever feedback is absent (incl. after a feedback error).
  assert.ok(/\{!feedback && \(/.test(CLIENT), "skip/feedback controls show when there is no feedback yet");
});

test("generation failure shows a truthful retryable error, not fabricated questions", () => {
  assert.ok(/try again/i.test(CLIENT), "retryable error copy");
  assert.ok(!/FALLBACK_QUESTIONS|LOCAL_QUESTIONS|localQuestions\s*=/.test(CLIENT), "no fabricated local questions");
});

// ── Persistence / dedup ───────────────────────────────────────────────────────
test("saving is dedup-guarded and skip does not require feedback to finish", () => {
  assert.ok(/savedRef\s*=\s*useRef\(false\)/.test(CLIENT), "dedup ref present");
  assert.ok(/if \(savedRef\.current\) return;/.test(CLIENT), "guards against duplicate inserts");
  assert.ok(/buildSessionFeedback\(answers, setup\.mode\)/.test(CLIENT), "persists resilient session blob");
  assert.ok(/score:\s*avg/.test(CLIENT), "stores aggregate (null when unscored), never a fake 0");
});

// ── Saved session view (owner-scoped, no AI) ──────────────────────────────────
test("saved-session review is owner-scoped and performs no AI call", () => {
  assert.ok(/from\("interview_sessions"\)[\s\S]*\.select\("id, job_title, interview_type, language, score, feedback, created_at"\)/.test(CLIENT), "reads only stored columns");
  assert.ok(/\.eq\("id", initialSessionId\)[\s\S]*\.eq\("user_id", session\.user\.id\)/.test(CLIENT), "owner-scoped read");
  // The review phase must not call either AI route.
  const reviewRegion = CLIENT.slice(CLIENT.indexOf('phase === "review"'));
  assert.ok(!/\/api\/interview\//.test(reviewRegion.slice(0, 4000)), "no AI fetch while viewing a saved session");
  assert.ok(/No per-answer detail/.test(CLIENT), "old/empty rows degrade truthfully");
});

test("delete is owner-scoped and confirmed", () => {
  assert.ok(/from\("interview_sessions"\)\s*\.delete\(\)[\s\S]*\.eq\("id", review\.id\)[\s\S]*\.eq\("user_id", session\.user\.id\)/.test(CLIENT), "owner-scoped delete");
  assert.ok(/confirmDelete/.test(CLIENT), "has a confirmation step");
});

test("reopen entry points wired (page param + dashboard View)", () => {
  assert.ok(/searchParams:\s*Promise<\{\s*id\?:/.test(PAGE) && /initialSessionId=\{id\}/.test(PAGE), "page passes the id");
  assert.ok(/href=\{`\/interview-coach\?id=\$\{s\.id\}`\}/.test(WIDGET), "dashboard View links to the session");
});
