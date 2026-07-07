"use client";

import { useState, useEffect, useRef } from "react";
import { INTERVIEW_QUESTIONS } from "@/app/components/interview-coach/types";

interface MockInterviewProps {
  onFeedbackReady: (questionIndex: number, answer: string) => void;
}

type MicState = "idle" | "recording" | "processing";

export default function MockInterview({ onFeedbackReady }: MockInterviewProps) {
  const [activeIdx, setActiveIdx]       = useState(0);
  const [micState, setMicState]         = useState<MicState>("idle");
  const [seconds, setSeconds]           = useState(0);
  const [typedAnswer, setTypedAnswer]   = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Timer while recording */
  useEffect(() => {
    if (micState === "recording") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [micState]);

  const handleMicClick = () => {
    if (micState === "idle") {
      setMicState("recording");
    } else if (micState === "recording") {
      setMicState("processing");
      setTimeout(() => {
        setMicState("idle");
        onFeedbackReady(activeIdx, typedAnswer || "Voice answer recorded.");
        setTypedAnswer("");
      }, 1500);
    }
  };

  const handleSubmitText = () => {
    if (!typedAnswer.trim()) return;
    onFeedbackReady(activeIdx, typedAnswer.trim());
    setTypedAnswer("");
  };

  const goNext = () => {
    setActiveIdx((i) => Math.min(i + 1, INTERVIEW_QUESTIONS.length - 1));
    setMicState("idle");
    setTypedAnswer("");
  };

  const goPrev = () => {
    setActiveIdx((i) => Math.max(i - 1, 0));
    setMicState("idle");
    setTypedAnswer("");
  };

  const question = INTERVIEW_QUESTIONS[activeIdx];
  const isRecording  = micState === "recording";
  const isProcessing = micState === "processing";

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: "rgba(13,13,22,0.8)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Practice Questions
        </p>
        <div className="flex items-center gap-1.5">
          {INTERVIEW_QUESTIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveIdx(i); setMicState("idle"); }}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeIdx ? "18px" : "8px",
                height: "8px",
                background: i === activeIdx ? "#f59e0b" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Question number + category */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
            style={{
              background: `${question.color}18`,
              border: `1px solid ${question.color}44`,
              color: question.color,
            }}
          >
            {question.category}
          </span>
          <span className="text-xs text-slate-600">{activeIdx + 1} of {INTERVIEW_QUESTIONS.length}</span>
        </div>

        {/* Question text */}
        <div
          className="rounded-xl p-4 border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p className="text-white font-semibold text-base leading-snug">{question.question}</p>
        </div>

        {/* Tip */}
        <div
          className="flex items-start gap-3 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed"
          style={{ background: `${question.color}0d`, border: `1px solid ${question.color}22` }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0" style={{ color: question.color }}>
            <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M7 4.5v3M7 9v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          <span><strong style={{ color: question.color }}>Tip: </strong>{question.tip}</span>
        </div>

        {/* Voice answer area */}
        <div
          className="rounded-2xl p-5 flex flex-col items-center gap-4 border"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-slate-500">Answer by voice</p>

          {/* Waveform bars — only visible while recording */}
          <div className="flex items-center gap-1 h-8">
            {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 0.5].map((h, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-150"
                style={{
                  width: "3px",
                  height: isRecording ? `${h * 28}px` : "4px",
                  background: isRecording ? "#f59e0b" : "rgba(255,255,255,0.12)",
                  animation: isRecording ? `wave 0.8s ease-in-out ${i * 60}ms infinite alternate` : "none",
                }}
              />
            ))}
          </div>

          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isProcessing}
            className="relative flex items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed"
            style={{
              width: "72px",
              height: "72px",
              background: isRecording
                ? "rgba(239,68,68,0.15)"
                : isProcessing
                ? "rgba(245,158,11,0.1)"
                : "rgba(245,158,11,0.12)",
              border: isRecording
                ? "2px solid rgba(239,68,68,0.5)"
                : isProcessing
                ? "2px solid rgba(245,158,11,0.4)"
                : "2px solid rgba(245,158,11,0.35)",
              boxShadow: isRecording
                ? "0 0 32px rgba(239,68,68,0.25)"
                : isProcessing
                ? "0 0 24px rgba(245,158,11,0.2)"
                : "0 0 24px rgba(245,158,11,0.15)",
            }}
          >
            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "rgba(239,68,68,0.15)" }}
                />
                <span
                  className="absolute rounded-full animate-ping"
                  style={{ inset: "-8px", background: "rgba(239,68,68,0.07)", animationDelay: "0.3s" }}
                />
              </>
            )}

            {isProcessing ? (
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
                <path d="M12 2a10 10 0 0110 10" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                width="26" height="26" viewBox="0 0 26 26" fill="none"
                stroke={isRecording ? "#ef4444" : "#f59e0b"}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="9" y="2" width="8" height="13" rx="4" />
                <path d="M4 13a9 9 0 0018 0" />
                <line x1="13" y1="22" x2="13" y2="26" />
                <line x1="9" y1="26" x2="17" y2="26" />
              </svg>
            )}
          </button>

          {/* Status text */}
          <div className="text-center">
            {isProcessing ? (
              <p className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                Processing your answer…
              </p>
            ) : isRecording ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-semibold text-red-400">Recording • Click to stop</p>
                <p className="text-xs font-mono" style={{ color: "#fbbf24" }}>{fmtTime(seconds)}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click the mic to start answering</p>
            )}
          </div>

          <p className="text-[11px] text-slate-600 text-center max-w-[260px]">
            Practice speaking your answer out loud — AI will provide structured feedback.
          </p>
        </div>

        {/* Text answer fallback */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">Or type your answer for AI feedback:</p>
          <textarea
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 input-glow resize-none"
            rows={3}
            placeholder="Type your answer here…"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSubmitText}
            disabled={!typedAnswer.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            Get AI Feedback
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIdx === 0}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Previous
          </button>

          <span className="text-xs text-slate-600">
            {activeIdx + 1} / {INTERVIEW_QUESTIONS.length}
          </span>

          <button
            type="button"
            onClick={goNext}
            disabled={activeIdx === INTERVIEW_QUESTIONS.length - 1}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline waveform keyframes */}
      <style>{`
        @keyframes wave {
          0%   { transform: scaleY(0.5); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
