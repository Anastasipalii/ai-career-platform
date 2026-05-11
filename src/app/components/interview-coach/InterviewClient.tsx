"use client";

import { useState } from "react";
import {
  InterviewSetupData,
  INTERVIEW_QUESTIONS,
  FEEDBACK_DATA,
} from "@/app/components/interview-coach/types";
import InterviewHero from "@/app/components/interview-coach/InterviewHero";
import InterviewSetup from "@/app/components/interview-coach/InterviewSetup";
import InterviewUpload from "@/app/components/interview-coach/InterviewUpload";
import MockInterview from "@/app/components/interview-coach/MockInterview";
import FeedbackPanel from "@/app/components/interview-coach/FeedbackPanel";
import PracticeModes from "@/app/components/interview-coach/PracticeModes";
import InterviewExport from "@/app/components/interview-coach/InterviewExport";

const INITIAL_SETUP: InterviewSetupData = {
  jobTitle:       "Senior Product Designer",
  industry:       "Technology",
  seniority:      "Senior",
  interviewType:  "HR Interview",
  language:       "English (US)",
};

export default function InterviewClient() {
  const [setupData, setSetupData]               = useState<InterviewSetupData>(INITIAL_SETUP);
  const [feedbackQuestionIdx, setFeedbackQuestionIdx] = useState<number | null>(null);

  const handleFeedbackReady = (idx: number) => {
    setFeedbackQuestionIdx(idx);
  };

  const hasFeedback = feedbackQuestionIdx !== null;
  const activeFeedback = hasFeedback ? FEEDBACK_DATA[feedbackQuestionIdx] : null;
  const activeQuestion = hasFeedback ? INTERVIEW_QUESTIONS[feedbackQuestionIdx] : null;

  return (
    <>
      <InterviewHero />
      <div className="section-divider" />

      {/* ── Main coach section ── */}
      <section id="coach" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Interview coach
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — setup + upload */}
            <div className="flex flex-col gap-5">
              <InterviewSetup data={setupData} onChange={setSetupData} />
              <InterviewUpload />
            </div>

            {/* Right — sticky: mock interview + feedback + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <MockInterview onFeedbackReady={handleFeedbackReady} />

              {activeFeedback && activeQuestion && (
                <FeedbackPanel
                  data={activeFeedback}
                  questionText={activeQuestion.question}
                />
              )}

              <InterviewExport hasFeedback={hasFeedback} />

              {hasFeedback && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Answer another question to refresh your feedback
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <PracticeModes />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(124,58,237,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Walk in confident, walk out with the offer
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ job seekers who use CareerAI to prepare smarter and interview better.
          </p>
          <a
            href="#coach"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #d97706, #7c3aed)",
              boxShadow: "0 0 40px rgba(217,119,6,0.35)",
            }}
          >
            Start Practicing Now
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
