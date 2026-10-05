"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  InterviewMode,
  InterviewLanguage,
  AIQuestion,
  FeedbackData,
  SessionAnswer,
  SimpleSetupData,
  MODE_LABELS,
  MODE_COUNTS,
  MODE_DURATIONS,
  INTERVIEW_LANGUAGES,
} from "@/app/components/interview-coach/types";
import Toast from "@/app/components/ui/Toast";
import InterviewHero from "@/app/components/interview-coach/InterviewHero";
import FeedbackPanel from "@/app/components/interview-coach/FeedbackPanel";
import { aggregateScore, buildSessionFeedback, type StoredAnswer, type StoredFeedback } from "@/lib/interview/session";

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "setup" | "active" | "complete" | "review";

interface ReviewData {
  id: string;
  jobTitle: string;
  interviewType: string;
  language: string;
  score: number | null;
  createdAt: string;
  answers: StoredAnswer[];
}

// ── Mode config ───────────────────────────────────────────────────────────────
const MODE_ICONS: Record<InterviewMode, React.ReactNode> = {
  quick: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  hr: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  technical: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  full: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const MODE_COLORS: Record<InterviewMode, { color: string; bg: string; border: string }> = {
  quick:     { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  hr:        { color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.3)"   },
  technical: { color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
  full:      { color: "#7c3aed", bg: "rgba(124,58,237,0.12)",  border: "rgba(124,58,237,0.3)"  },
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm " +
  "text-slate-200 placeholder-slate-500 transition-all input-glow";

function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg className="animate-spin shrink-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2.5} stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
      <path
        d={`M ${size / 2} 2.5 a ${size / 2 - 2.5} ${size / 2 - 2.5} 0 0 1 ${size / 2 - 2.5} ${size / 2 - 2.5}`}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  );
}

// ── Category color ────────────────────────────────────────────────────────────
function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Opening: "#7c3aed", Behavioral: "#f59e0b", Motivation: "#06b6d4",
    Technical: "#10b981", Situational: "#8b5cf6", "Cultural Fit": "#ec4899", Closing: "#6b7280",
  };
  return map[cat] ?? "#94a3b8";
}

interface InterviewClientProps {
  /** When present, open a saved session in read-only review mode (owner-scoped). */
  initialSessionId?: string;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InterviewClient({ initialSessionId }: InterviewClientProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(initialSessionId ? "review" : "setup");

  const [setup, setSetup] = useState<SimpleSetupData>({
    jobDescription: "",
    jobTitle:       "",
    mode:           "quick",
    language:       "English (US)",
  });

  const [questions, setQuestions]       = useState<AIQuestion[]>([]);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [typedAnswer, setTypedAnswer]   = useState("");
  const [feedback, setFeedback]         = useState<FeedbackData | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);

  const [isGenerating, setIsGenerating]     = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Review (read-only saved session) state.
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(!!initialSessionId);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Guards against duplicate session inserts from repeated Finish actions.
  const savedRef = useRef(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Review: load a saved session read-only (owner-scoped, NO AI call) ────────
  useEffect(() => {
    if (!initialSessionId) return;
    let cancelled = false;
    (async () => {
      setReviewLoading(true);
      setReviewError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id, job_title, interview_type, language, score, feedback, created_at")
        .eq("id", initialSessionId)
        .eq("user_id", session.user.id) // defensive; RLS already restricts to owner
        .single();
      if (cancelled) return;
      if (error || !data) {
        setReviewError("Couldn't open that interview session.");
        setReviewLoading(false);
        return;
      }
      const row = data as {
        id: string; job_title: string | null; interview_type: string;
        language: string; score: number | null; feedback: unknown; created_at: string;
      };
      const fb = (row.feedback ?? {}) as StoredFeedback;
      const answers: StoredAnswer[] = Array.isArray(fb.answers)
        ? fb.answers.map((a) => ({
            question: typeof a?.question === "string" ? a.question : "",
            answer:   typeof a?.answer === "string" ? a.answer : "",
            // Back-compat: older rows had no `scored` flag — infer from presence of scores.
            scored:   typeof a?.scored === "boolean" ? a.scored : !!a?.scores,
            scores:   a?.scores,
            improvedAnswer: a?.improvedAnswer,
            strengths: a?.strengths,
            mistakes: a?.mistakes,
            keywords: a?.keywords,
          }))
        : [];
      setReview({
        id: row.id,
        jobTitle: row.job_title ?? "",
        interviewType: row.interview_type,
        language: row.language,
        score: row.score,
        createdAt: row.created_at,
        answers,
      });
      setReviewLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initialSessionId, router]);

  // ── Start interview ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!setup.jobDescription.trim() && !setup.jobTitle.trim()) {
      showToast("Please enter a job title or paste a job description.", "error");
      return;
    }

    setIsGenerating(true);
    setAiError(null);

    try {
      const res = await authedFetch("/api/interview/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(setup),
      });

      const data = await res.json() as { questions?: AIQuestion[]; error?: string };

      if (!res.ok || data.error) {
        // Truthful retryable error — we never fabricate local questions.
        setAiError(data.error ?? "We couldn't generate questions right now. Please try again.");
        return;
      }

      setQuestions(data.questions ?? []);
      setCurrentIdx(0);
      setTypedAnswer("");
      setFeedback(null);
      setSessionAnswers([]);
      savedRef.current = false;
      setPhase("active");
    } catch {
      setAiError("Connection failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Get feedback ────────────────────────────────────────────────────────────
  const handleGetFeedback = async () => {
    if (!typedAnswer.trim()) {
      showToast("Please type your answer first.", "error");
      return;
    }

    const question = questions[currentIdx];
    if (!question) return;

    setIsGettingFeedback(true);
    setFeedback(null);
    setAiError(null);

    try {
      const res = await authedFetch("/api/interview/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:      question.question,
          answer:        typedAnswer,
          jobTitle:      setup.jobTitle || "the role",
          industry:      "Technology",
          interviewType: MODE_LABELS[setup.mode],
          language:      setup.language,
        }),
      });

      const data = await res.json() as FeedbackData & { error?: string };

      if (!res.ok || data.error) {
        // Truthful error; the user can retry OR skip without being trapped.
        setAiError(data.error ?? "Feedback is unavailable right now — you can try again or continue without a score.");
        return;
      }

      setFeedback(data);
    } catch {
      setAiError("Feedback failed. You can try again or continue without a score.");
    } finally {
      setIsGettingFeedback(false);
    }
  };

  // ── Advance (with an AI score, or skipped/unscored) ──────────────────────────
  const advance = (fb: FeedbackData | null) => {
    const question = questions[currentIdx];
    if (!question) return;

    const updated = [...sessionAnswers, { question, answer: typedAnswer, feedback: fb } as SessionAnswer];
    setSessionAnswers(updated);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setTypedAnswer("");
      setFeedback(null);
      setAiError(null);
    } else {
      setPhase("complete");
      void saveSession(updated);
    }
  };

  const handleNext = () => advance(feedback);
  const handleSkip = () => advance(null); // continue without a score — never fabricated

  // ── Save session (resilient; dedup-guarded) ──────────────────────────────────
  const saveSession = async (answers: SessionAnswer[]) => {
    if (savedRef.current) return; // never double-insert on repeated Finish
    savedRef.current = true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const avg = aggregateScore(answers); // null when nothing was scored
    const { error } = await supabase.from("interview_sessions").insert({
      user_id:       session.user.id,
      job_title:     setup.jobTitle || "Unknown Role",
      interview_type: MODE_LABELS[setup.mode],
      language:      setup.language,
      score:         avg, // null (not 0) when no answer was genuinely scored
      feedback:      buildSessionFeedback(answers, setup.mode),
    });
    if (error) {
      savedRef.current = false; // allow a retry path if the insert failed
      showToast("Couldn't save this session.", "error");
    }
  };

  const handleReset = () => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIdx(0);
    setTypedAnswer("");
    setFeedback(null);
    setSessionAnswers([]);
    setAiError(null);
    savedRef.current = false;
  };

  // ── Delete a saved session (owner-scoped, confirmed) ─────────────────────────
  const handleDeleteSession = async () => {
    if (!review) return;
    setIsDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { error } = await supabase
      .from("interview_sessions")
      .delete()
      .eq("id", review.id)
      .eq("user_id", session.user.id);
    setIsDeleting(false);
    if (error) {
      showToast("Couldn't delete this session.", "error");
      return;
    }
    showToast("Interview session deleted.", "success");
    router.push("/dashboard");
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIdx];
  const totalQ = questions.length;
  const completedQ = sessionAnswers.length;
  const liveAvg = aggregateScore(sessionAnswers);

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
          <div className="flex items-center gap-3 mb-10">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              {phase === "review" ? "Saved interview session" : "Interview coach"}
            </span>
            <div className="section-divider flex-1" />
          </div>

          {/* ──────────── PHASE: REVIEW (read-only saved session) ──────────── */}
          {phase === "review" && (
            <div className="max-w-2xl mx-auto flex flex-col gap-5">
              {reviewLoading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-slate-400 text-sm">
                  <Spinner size={18} color="#f59e0b" /> Loading your saved session…
                </div>
              ) : reviewError ? (
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
                >
                  <span className="leading-relaxed">{reviewError}</span>
                </div>
              ) : review ? (
                <>
                  {/* Summary header */}
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="px-6 py-5 border-b flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(245,158,11,0.04)" }}>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white truncate">{review.interviewType}</h2>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {review.jobTitle || "General"} · {review.language}
                        </p>
                      </div>
                      {review.score !== null ? (
                        <div className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5 shrink-0" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                          <span className="text-lg font-bold leading-none" style={{ color: "#10b981" }}>{review.score}</span>
                          <span className="text-[9px] font-medium mt-0.5" style={{ color: "#10b981", opacity: 0.7 }}>/100</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 shrink-0">Not scored</span>
                      )}
                    </div>

                    <div className="p-6 flex flex-col gap-4">
                      {review.answers.length === 0 ? (
                        <p className="text-sm text-slate-500">No per-answer detail was stored for this session.</p>
                      ) : (
                        review.answers.map((a, i) => (
                          <div key={i} className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                            <p className="text-sm font-semibold text-white leading-snug mb-2">{a.question || `Question ${i + 1}`}</p>
                            {a.answer && (
                              <p className="text-xs text-slate-400 whitespace-pre-line mb-3">{a.answer}</p>
                            )}
                            {a.scored && a.scores ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-4 text-[11px] text-slate-400">
                                  <span>Clarity <strong className="text-slate-200">{a.scores.clarity}</strong></span>
                                  <span>Confidence <strong className="text-slate-200">{a.scores.confidence}</strong></span>
                                  <span>Structure <strong className="text-slate-200">{a.scores.structure}</strong></span>
                                </div>
                                {a.improvedAnswer && (
                                  <div className="text-xs text-slate-400 leading-relaxed">
                                    <span className="text-slate-500 uppercase tracking-wide text-[10px]">Suggested improved answer</span>
                                    <p className="mt-1">&ldquo;{a.improvedAnswer}&rdquo;</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" }}>
                                Not scored
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:border-white/20 hover:text-white"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSession}
                          disabled={isDeleting}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}
                        >
                          {isDeleting ? "Deleting…" : "Delete permanently"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}
                      >
                        Delete this session
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push("/interview-coach")}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #d97706, #7c3aed)" }}
                    >
                      Start a new practice session
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ──────────── PHASE: SETUP ──────────── */}
          {phase === "setup" && (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(245,158,11,0.04)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="9" rx="3.5" />
                        <path d="M3 11a9 9 0 0018 0" /><line x1="12" y1="20" x2="12" y2="22" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">Set up your interview</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Tell us about the role and choose your practice format</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Job Description or Vacancy URL</label>
                    <textarea
                      className={inputCls + " resize-none"}
                      rows={5}
                      placeholder={"Paste the job description, requirements, or a vacancy URL here.\n\nThe more detail you provide, the more relevant the interview questions will be."}
                      value={setup.jobDescription}
                      onChange={(e) => setSetup({ ...setup, jobDescription: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Job Title <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <input
                      className={inputCls}
                      placeholder="e.g. Senior Product Designer, Software Engineer"
                      value={setup.jobTitle}
                      onChange={(e) => setSetup({ ...setup, jobTitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Interview Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["quick", "hr", "technical", "full"] as InterviewMode[]).map((m) => {
                        const active = setup.mode === m;
                        const mc = MODE_COLORS[m];
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSetup({ ...setup, mode: m })}
                            className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5"
                            style={active
                              ? { background: mc.bg, borderColor: mc.border, boxShadow: `0 0 16px ${mc.bg}` }
                              : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: active ? mc.bg : "rgba(255,255,255,0.05)", color: active ? mc.color : "#475569", border: `1px solid ${active ? mc.border : "transparent"}` }}>
                              {MODE_ICONS[m]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: active ? mc.color : "rgba(255,255,255,0.7)" }}>{MODE_LABELS[m]}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{MODE_COUNTS[m]} questions · {MODE_DURATIONS[m]}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Interview Language</label>
                    <div className="relative">
                      <select
                        className={inputCls + " appearance-none cursor-pointer pr-10"}
                        value={setup.language}
                        onChange={(e) => setSetup({ ...setup, language: e.target.value as InterviewLanguage })}
                      >
                        {INTERVIEW_LANGUAGES.map((l) => (
                          <option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {aiError && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-px">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
                        <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                      </svg>
                      <span className="leading-relaxed">{aiError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                    style={{ background: "linear-gradient(135deg, #d97706, #7c3aed)", boxShadow: isGenerating ? "none" : "0 0 40px rgba(217,119,6,0.3)" }}
                  >
                    {isGenerating ? (
                      <><Spinner size={18} color="white" />Generating questions…</>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="6 3 15 9 6 15" fill="white" fillOpacity="0.8" />
                        </svg>
                        Start Interview
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────── PHASE: ACTIVE ──────────── */}
          {phase === "active" && currentQuestion && (
            <div className="max-w-2xl mx-auto flex flex-col gap-5">
              <div className="rounded-2xl px-5 py-4 border" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: MODE_COLORS[setup.mode].bg, color: MODE_COLORS[setup.mode].color, border: `1px solid ${MODE_COLORS[setup.mode].border}` }}>
                      {MODE_LABELS[setup.mode]}
                    </span>
                    {setup.jobTitle && <span className="text-xs text-slate-500 truncate max-w-[200px]">{setup.jobTitle}</span>}
                  </div>
                  <span className="text-sm font-semibold text-slate-300">
                    {currentIdx + 1}<span className="text-slate-600"> / {totalQ}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(currentIdx / totalQ) * 100}%`, background: "linear-gradient(90deg, #d97706, #7c3aed)" }} />
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: `${categoryColor(currentQuestion.category)}18`, border: `1px solid ${categoryColor(currentQuestion.category)}44`, color: categoryColor(currentQuestion.category) }}>
                    {currentQuestion.category}
                  </span>
                  <span className="text-xs text-slate-600">Question {currentIdx + 1} of {totalQ}</span>
                </div>

                <div className="px-6 py-6 flex flex-col gap-5">
                  <p className="text-lg font-semibold text-white leading-snug">{currentQuestion.question}</p>

                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 leading-relaxed"
                    style={{ background: `${categoryColor(currentQuestion.category)}08`, border: `1px solid ${categoryColor(currentQuestion.category)}22` }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5" style={{ color: categoryColor(currentQuestion.category) }}>
                      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.25" />
                      <path d="M7 4.5v3M7 9v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                    </svg>
                    <span><strong style={{ color: categoryColor(currentQuestion.category) }}>Tip: </strong>{currentQuestion.tip}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Your Answer</label>
                    <textarea
                      className={inputCls + " resize-none"}
                      rows={5}
                      placeholder="Type your answer here…"
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      disabled={isGettingFeedback || !!feedback}
                    />
                    <p className="text-xs text-slate-600 mt-1.5 text-right tabular-nums">{typedAnswer.length} chars</p>
                  </div>

                  {aiError && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-px">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
                        <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                      </svg>
                      <span className="leading-relaxed">{aiError}</span>
                    </div>
                  )}

                  {!feedback && (
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={handleGetFeedback}
                        disabled={isGettingFeedback || !typedAnswer.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #d97706, #7c3aed)", boxShadow: isGettingFeedback || !typedAnswer.trim() ? "none" : "0 0 24px rgba(217,119,6,0.25)" }}
                      >
                        {isGettingFeedback ? (
                          <><Spinner size={16} color="white" />Analysing your answer…</>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="7 1 8.7 4.8 13 5.3 10 8 10.9 12.3 7 10.2 3.1 12.3 4 8 1 5.3 5.3 4.8" />
                            </svg>
                            Get AI Feedback
                          </>
                        )}
                      </button>
                      {/* Resilient path: never trapped if feedback is unavailable. */}
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isGettingFeedback}
                        className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:text-white hover:border-white/20 disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                      >
                        {currentIdx < questions.length - 1 ? "Skip feedback & continue" : "Skip feedback & finish"}{" "}
                        <span className="text-slate-600">(not scored)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {feedback && currentQuestion && (
                <div className="flex flex-col gap-4">
                  <FeedbackPanel data={feedback} questionText={currentQuestion.question} />
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
                    style={{ background: "linear-gradient(135deg, #d97706, #7c3aed)", boxShadow: "0 0 24px rgba(217,119,6,0.25)" }}
                  >
                    {currentIdx < questions.length - 1 ? (
                      <>Next Question<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9M8 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></>
                    ) : (
                      <>Finish Interview<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l4 4 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg></>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ──────────── PHASE: COMPLETE ──────────── */}
          {phase === "complete" && (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-8 border-b text-center" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(16,185,129,0.04)" }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14l7 7L24 7" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Interview Complete!</h2>
                  <p className="text-slate-400 text-sm">Great work — here&apos;s how you did</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Avg Score", value: liveAvg === null ? "—" : `${liveAvg}`, unit: liveAvg === null ? "" : "/100", color: liveAvg === null ? "#64748b" : liveAvg >= 80 ? "#10b981" : liveAvg >= 60 ? "#f59e0b" : "#ef4444" },
                      { label: "Scored", value: `${sessionAnswers.filter((a) => a.feedback !== null).length}`, unit: `/${completedQ}`, color: "#7c3aed" },
                      { label: "Mode", value: MODE_LABELS[setup.mode].split(" ")[0], unit: "", color: MODE_COLORS[setup.mode].color },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}<span className="text-sm font-normal text-slate-600">{s.unit}</span></div>
                        <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {liveAvg === null && (
                    <p className="text-xs text-slate-500 text-center mb-4">No answers were scored in this session — it was saved without a score.</p>
                  )}

                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
                      style={{ background: "linear-gradient(135deg, #d97706, #7c3aed)", boxShadow: "0 0 24px rgba(217,119,6,0.25)" }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 3.5A6.5 6.5 0 102 9" /><path d="M2 5.5V9H5.5" /></svg>
                      Practice Again
                    </button>
                    <button type="button" onClick={() => router.push("/dashboard")} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                      View in Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
