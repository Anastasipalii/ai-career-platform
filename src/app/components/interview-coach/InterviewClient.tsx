"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  InterviewSetupData,
  FeedbackData,
  INTERVIEW_QUESTIONS,
} from "@/app/components/interview-coach/types";
import Toast from "@/app/components/ui/Toast";
import InterviewHero from "@/app/components/interview-coach/InterviewHero";
import InterviewSetup from "@/app/components/interview-coach/InterviewSetup";
import InterviewUpload from "@/app/components/interview-coach/InterviewUpload";
import MockInterview from "@/app/components/interview-coach/MockInterview";
import FeedbackPanel from "@/app/components/interview-coach/FeedbackPanel";
import PracticeModes from "@/app/components/interview-coach/PracticeModes";
import InterviewExport from "@/app/components/interview-coach/InterviewExport";

const INITIAL_SETUP: InterviewSetupData = {
  jobTitle:      "Senior Product Designer",
  industry:      "Technology",
  seniority:     "Senior",
  interviewType: "HR Interview",
  language:      "English (US)",
};

export default function InterviewClient() {
  const router = useRouter();
  const [setupData, setSetupData]                 = useState<InterviewSetupData>(INITIAL_SETUP);
  const [feedbackQuestionIdx, setFeedbackQuestionIdx] = useState<number | null>(null);
  const [activeFeedback, setActiveFeedback]       = useState<FeedbackData | null>(null);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [toast, setToast]                         = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleFeedbackReady = async (idx: number, answer: string) => {
    const question = INTERVIEW_QUESTIONS[idx];
    if (!question) return;

    setFeedbackQuestionIdx(idx);
    setActiveFeedback(null);
    setIsFetchingFeedback(true);

    try {
      const res = await fetch("/api/interview/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:      question.question,
          answer:        answer || "I don't have a specific answer for this.",
          jobTitle:      setupData.jobTitle,
          industry:      setupData.industry,
          interviewType: setupData.interviewType,
          language:      setupData.language,
        }),
      });

      const data = await res.json() as FeedbackData & { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Feedback generation failed.");
      }

      setActiveFeedback(data);

      // Save session to Supabase (fire-and-forget)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const avgScore = Math.round((data.clarity + data.confidence + data.structure) / 3);
        await supabase.from("interview_sessions").insert({
          user_id:       session.user.id,
          job_title:     setupData.jobTitle,
          interview_type: setupData.interviewType,
          language:      setupData.language,
          score:         avgScore,
          feedback:      { ...data, question: question.question, answer },
        });
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not get AI feedback. Please try again.",
        "error"
      );
      setFeedbackQuestionIdx(null);
    } finally {
      setIsFetchingFeedback(false);
    }
  };

  const activeQuestion = feedbackQuestionIdx !== null ? INTERVIEW_QUESTIONS[feedbackQuestionIdx] : null;
  const hasFeedback    = activeFeedback !== null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <InterviewHero />
      <div className="section-divider" />

      <section id="coach" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Interview coach
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <InterviewSetup data={setupData} onChange={setSetupData} />
              <InterviewUpload />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <MockInterview onFeedbackReady={handleFeedbackReady} />

              {isFetchingFeedback && (
                <div
                  className="rounded-2xl border p-6 flex items-center justify-center gap-3"
                  style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
                    <path d="M9 2a7 7 0 017 7" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm text-slate-400">Generating AI feedback…</p>
                </div>
              )}

              {activeFeedback && activeQuestion && (
                <FeedbackPanel
                  data={activeFeedback}
                  questionText={activeQuestion.question}
                />
              )}

              <InterviewExport hasFeedback={hasFeedback} />

              {hasFeedback && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Answer another question to get more feedback
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <PracticeModes />
      <div className="section-divider" />

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
              boxShadow:  "0 0 40px rgba(217,119,6,0.35)",
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
