// ============================================================================
// interview/session — PURE helpers for scoring + persisting an interview run
// (Interview Coach Step 2). No React, no network → fully unit-testable.
// ----------------------------------------------------------------------------
// Only GENUINELY scored answers contribute to the aggregate; skipped/unscored
// answers are preserved truthfully (never faked as a 0 score).
// ============================================================================

import type { FeedbackData, SessionAnswer } from "@/app/components/interview-coach/types";

export interface StoredAnswer {
  question: string;
  answer: string;
  /** true only when the answer received a real AI score. */
  scored: boolean;
  scores?: { clarity: number; confidence: number; structure: number };
  improvedAnswer?: string;
  strengths?: string[];
  mistakes?: string[];
  keywords?: string[];
}

export interface StoredFeedback {
  mode?: string;
  avgScore?: number | null;
  scoredCount?: number;
  totalCount?: number;
  answers?: StoredAnswer[];
}

const answerScore = (f: FeedbackData): number =>
  Math.round((f.clarity + f.confidence + f.structure) / 3);

/** Average of scored answers only; null when none were scored (never 0). */
export function aggregateScore(answers: SessionAnswer[]): number | null {
  const scored = answers.filter((a) => a.feedback !== null) as (SessionAnswer & { feedback: FeedbackData })[];
  if (scored.length === 0) return null;
  const sum = scored.reduce((s, a) => s + answerScore(a.feedback), 0);
  return Math.round(sum / scored.length);
}

/** Map session answers to the stored shape, marking unscored answers truthfully. */
export function buildStoredAnswers(answers: SessionAnswer[]): StoredAnswer[] {
  return answers.map((a) =>
    a.feedback
      ? {
          question: a.question.question,
          answer: a.answer,
          scored: true,
          scores: { clarity: a.feedback.clarity, confidence: a.feedback.confidence, structure: a.feedback.structure },
          improvedAnswer: a.feedback.improvedAnswer,
          strengths: a.feedback.strengths ?? [],
          mistakes: a.feedback.mistakes ?? [],
          keywords: a.feedback.keywords ?? [],
        }
      : { question: a.question.question, answer: a.answer, scored: false }
  );
}

/** Full feedback JSON persisted into interview_sessions.feedback. */
export function buildSessionFeedback(answers: SessionAnswer[], mode: string): Required<StoredFeedback> {
  return {
    mode,
    avgScore: aggregateScore(answers),
    scoredCount: answers.filter((a) => a.feedback !== null).length,
    totalCount: answers.length,
    answers: buildStoredAnswers(answers),
  };
}
