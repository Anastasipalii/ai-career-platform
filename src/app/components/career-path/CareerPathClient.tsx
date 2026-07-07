"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CareerGoalData, RoadmapPhase } from "@/app/components/career-path/types";
import Toast from "@/app/components/ui/Toast";
import CareerPathHero from "@/app/components/career-path/CareerPathHero";
import CareerPathUpload from "@/app/components/career-path/CareerPathUpload";
import CareerGoalForm from "@/app/components/career-path/CareerGoalForm";

// ── LocalStorage key ──────────────────────────────────────────────────────────
const LS_KEY = "career-planner-state";

interface PersistedState {
  phases:       RoadmapPhase[];
  checkedTasks: string[];
  goalData:     CareerGoalData;
}

function loadFromStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function saveToStorage(state: PersistedState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

function clearStorage() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ── Initial goal ──────────────────────────────────────────────────────────────
const INITIAL_GOAL: CareerGoalData = {
  currentTitle: "",
  targetTitle:  "",
  industry:     "Technology",
  country:      "",
  workStyle:    "Remote",
  experience:   "Senior",
  timeGoal:     "12 months",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function CareerPathClient() {
  const router = useRouter();

  const [goalData, setGoalData]         = useState<CareerGoalData>(INITIAL_GOAL);
  const [fileName, setFileName]         = useState<string | null>(null);
  const [generated, setGenerated]       = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPhases, setAiPhases]         = useState<RoadmapPhase[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [careerPathId, setCareerPathId] = useState<string | null>(null);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Restore from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = loadFromStorage();
    if (saved?.phases?.length) {
      setAiPhases(saved.phases);
      setCheckedTasks(new Set(saved.checkedTasks ?? []));
      setGoalData(saved.goalData ?? INITIAL_GOAL);
      setGenerated(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ── Sync checkedTasks to localStorage whenever they change ──────────────────
  useEffect(() => {
    if (generated && aiPhases.length > 0) {
      saveToStorage({
        phases:       aiPhases,
        checkedTasks: Array.from(checkedTasks),
        goalData,
      });
    }
  }, [checkedTasks, generated, aiPhases, goalData]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!goalData.currentTitle.trim() || !goalData.targetTitle.trim()) {
      showToast("Please enter your current and target job titles.", "error");
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    setAiPhases([]);
    setCheckedTasks(new Set());
    clearStorage();

    try {
      const res = await fetch("/api/career-path/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(goalData),
      });

      const data = await res.json() as { phases?: RoadmapPhase[]; error?: string };

      if (!res.ok || data.error) throw new Error(data.error ?? "Roadmap generation failed.");

      setAiPhases(data.phases ?? []);
      setGenerated(true);
      setCareerPathId(null);
      setSaveStatus("idle");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Generation failed. Please try again.",
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Toggle checkbox ─────────────────────────────────────────────────────────
  const toggleTask = (key: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Save to Supabase ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!generated || aiPhases.length === 0) {
      showToast("Generate a roadmap first.", "error");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");

    const payload = {
      user_id:      session.user.id,
      current_role: goalData.currentTitle,
      target_role:  goalData.targetTitle,
      roadmap:      { phases: aiPhases, goalData, checkedTasks: Array.from(checkedTasks) },
      progress:     progressPct,
    };

    let dbError;
    if (careerPathId) {
      const { error } = await supabase.from("career_paths").update(payload).eq("id", careerPathId);
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from("career_paths").insert(payload).select("id").single();
      dbError = error;
      if (!error && data) setCareerPathId((data as { id: string }).id);
    }

    if (dbError) {
      setSaveStatus("idle");
      showToast(`Save failed: ${dbError.message}`, "error");
    } else {
      setSaveStatus("saved");
      showToast("Roadmap saved to your dashboard!", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // ── Progress ────────────────────────────────────────────────────────────────
  const totalTasks     = aiPhases.reduce((s, p) => s + p.tasks.length, 0);
  const completedTasks = checkedTasks.size;
  const progressPct    = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressColor  = progressPct >= 75 ? "#10b981" : progressPct >= 40 ? "#f59e0b" : "#ec4899";

  // Build flat list of completed task entries for the completed section
  const completedEntries: { label: string; phaseColor: string }[] = [];
  aiPhases.forEach((phase) => {
    phase.tasks.forEach((task, i) => {
      if (checkedTasks.has(`${phase.id}-${i}`)) {
        completedEntries.push({ label: task, phaseColor: phase.color });
      }
    });
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <CareerPathHero />
      <div className="section-divider" />

      <section id="planner" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-10">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Career planner
            </span>
            <div className="section-divider flex-1" />
          </div>

          {/* ── Setup form (always visible if not generated, or collapsible) ── */}
          {!generated ? (
            <div className="flex flex-col gap-4">
              <CareerPathUpload fileName={fileName} onFileChange={setFileName} />
              <CareerGoalForm
                data={goalData}
                onChange={setGoalData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          ) : (
            /* ── Roadmap dashboard ── */
            <div className="flex flex-col gap-6">

              {/* ── Roadmap header ── */}
              <div
                className="rounded-2xl border px-6 py-5"
                style={{ background: "rgba(13,13,22,0.7)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white mb-0.5">Your Career Roadmap</h2>
                    {goalData.currentTitle && goalData.targetTitle && (
                      <p className="text-xs text-slate-500">
                        {goalData.currentTitle}
                        <span className="mx-1.5 text-slate-700">→</span>
                        {goalData.targetTitle}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold tabular-nums leading-none" style={{ color: progressColor }}>
                      {progressPct}%
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width:      `${progressPct}%`,
                      background: `linear-gradient(90deg, #be185d, ${progressColor})`,
                      minWidth:   progressPct > 0 ? "6px" : "0",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {completedTasks} of {totalTasks} tasks completed
                  </p>
                  <button
                    type="button"
                    onClick={() => { setGenerated(false); clearStorage(); setAiPhases([]); setCheckedTasks(new Set()); }}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Edit goals
                  </button>
                </div>
              </div>

              {/* ── Phase task sections ── */}
              {aiPhases.map((phase) => {
                const activeTasks = phase.tasks.filter((_, i) => !checkedTasks.has(`${phase.id}-${i}`));
                if (activeTasks.length === 0) return null; // hide fully completed phases
                return (
                  <div key={phase.id} className="flex flex-col gap-0">
                    {/* Phase divider header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: `${phase.color}20`, border: `1px solid ${phase.color}50`, color: phase.color }}>
                        {phase.id}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{phase.title}</span>
                      <span className="text-[10px] text-slate-600">{phase.months}</span>
                      <div className="flex-1 h-px" style={{ background: `${phase.color}20` }} />
                      <span className="text-[10px] font-medium tabular-nums" style={{ color: `${phase.color}99` }}>
                        {activeTasks.length} left
                      </span>
                    </div>

                    {/* Tasks */}
                    <div
                      className="rounded-2xl border divide-y overflow-hidden"
                      style={{
                        background:  "rgba(13,13,22,0.6)",
                        borderColor: "rgba(255,255,255,0.07)",
                      }}
                    >
                      {phase.tasks.map((task, i) => {
                        const key     = `${phase.id}-${i}`;
                        const checked = checkedTasks.has(key);
                        if (checked) return null; // completed tasks moved to bottom section
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleTask(key)}
                            className="flex items-center gap-3.5 px-5 py-3.5 w-full text-left hover:bg-white/[0.02] transition-colors group"
                          >
                            {/* Checkbox */}
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 group-hover:border-opacity-60"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border:     `1.5px solid rgba(255,255,255,0.14)`,
                              }}
                            />
                            <span className="text-sm text-slate-300 leading-snug">{task}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Completed tasks section ── */}
              {completedEntries.length > 0 && (
                <div className="flex flex-col gap-0">
                  {/* Divider header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1 4.5l2.5 2.5 4.5-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#10b981" }}>Completed</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(16,185,129,0.15)" }} />
                    <span className="text-[10px] font-medium tabular-nums" style={{ color: "rgba(16,185,129,0.6)" }}>
                      {completedEntries.length}
                    </span>
                  </div>

                  <div
                    className="rounded-2xl border divide-y overflow-hidden"
                    style={{ background: "rgba(13,13,22,0.4)", borderColor: "rgba(16,185,129,0.1)" }}
                  >
                    {completedEntries.map(({ label, phaseColor }, idx) => {
                      // Find the original key to un-check
                      let originalKey = "";
                      outer: for (const phase of aiPhases) {
                        for (let i = 0; i < phase.tasks.length; i++) {
                          if (phase.tasks[i] === label && phase.color === phaseColor && checkedTasks.has(`${phase.id}-${i}`)) {
                            originalKey = `${phase.id}-${i}`;
                            break outer;
                          }
                        }
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => originalKey && toggleTask(originalKey)}
                          className="flex items-center gap-3.5 px-5 py-3.5 w-full text-left hover:bg-white/[0.015] transition-colors group"
                        >
                          {/* Filled checkbox */}
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{ background: "#10b981", border: "1.5px solid #10b981" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <span className="text-sm leading-snug line-through" style={{ color: "#475569" }}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── All tasks done message ── */}
              {totalTasks > 0 && completedTasks === totalTasks && (
                <div
                  className="rounded-2xl border px-6 py-8 text-center"
                  style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
                >
                  <div className="text-2xl mb-2">🎉</div>
                  <p className="text-sm font-semibold text-white mb-1">All tasks completed!</p>
                  <p className="text-xs text-slate-500">
                    You&apos;ve completed your roadmap from {goalData.currentTitle} to {goalData.targetTitle}.
                  </p>
                </div>
              )}

              {/* ── Save + Regenerate row ── */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: saveStatus === "saved"
                      ? "rgba(16,185,129,0.15)"
                      : "linear-gradient(135deg, #be185d, #ec4899)",
                    boxShadow: saveStatus === "saved" || saveStatus === "saving" ? "none" : "0 0 24px rgba(236,72,153,0.25)",
                  }}
                >
                  {saveStatus === "saving" ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                        <path d="M7 1.5a5.5 5.5 0 015.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Saving…
                    </>
                  ) : saveStatus === "saved" ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5 7-7" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ color: "#6ee7b7" }}>Saved to Dashboard</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1.5 1.5h8L13 5v8H1.5z" stroke="white" strokeWidth="1.25" strokeLinejoin="round" />
                        <rect x="3.5" y="8" width="7" height="4" rx="0.5" stroke="white" strokeWidth="1" />
                        <rect x="4" y="1.5" width="5" height="3" rx="0.5" stroke="white" strokeWidth="1" />
                      </svg>
                      Save Roadmap
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-200 hover:text-slate-300 disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
                >
                  {isGenerating ? (
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                      <path d="M6.5 1.5a5 5 0 015 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                      <path d="M11.5 2.5A5.5 5.5 0 101.5 7" /><path d="M1.5 3.5V7h3.5" />
                    </svg>
                  )}
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
