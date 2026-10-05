"use client";

import { useState, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CareerGoalData, RoadmapPhase } from "@/app/components/career-path/types";
import Toast from "@/app/components/ui/Toast";
import CareerPathHero from "@/app/components/career-path/CareerPathHero";
import CareerPathUpload from "@/app/components/career-path/CareerPathUpload";
import CareerGoalForm from "@/app/components/career-path/CareerGoalForm";
import { readScoped, writeScoped, removeScoped } from "@/lib/security/clientStorage";

// ── Account-scoped local persistence ───────────────────────────────────────────
// Roadmap/goals/progress are user-sensitive, so they are stored under the
// signed-in user's scoped key via clientStorage (never a global key). The legacy
// unscoped "career-planner-state" key is purged by the account-isolation cleanup.

interface PersistedState {
  phases:       RoadmapPhase[];
  checkedTasks: string[];
  goalData:     CareerGoalData;
  /** The saved DB row id this local state belongs to (null until saved). */
  careerPathId: string | null;
}

function loadFromStorage(): PersistedState | null {
  return readScoped<PersistedState>("career-path-state");
}

function saveToStorage(state: PersistedState) {
  writeScoped("career-path-state", state);
}

function clearStorage() {
  removeScoped("career-path-state");
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
export default function CareerPathClient({ initialPathId }: { initialPathId?: string }) {
  const router = useRouter();

  const [goalData, setGoalData]         = useState<CareerGoalData>(INITIAL_GOAL);
  const [fileName, setFileName]         = useState<string | null>(null);
  const [generated, setGenerated]       = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPhases, setAiPhases]         = useState<RoadmapPhase[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");
  const [careerPathId, setCareerPathId] = useState<string | null>(null);
  const [resumeText, setResumeText]     = useState<string>("");
  const [pendingDiscard, setPendingDiscard] = useState<null | "regen" | "edit">(null);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [loadingSaved, setLoadingSaved]     = useState<boolean>(!!initialPathId);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  const RESUME_TEXT_CAP = 12000;

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);


  // ── Restore from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    if (initialPathId) return; // reopening a saved row — DB wins, see the effect below
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = loadFromStorage();
    if (saved?.phases?.length) {
      setAiPhases(saved.phases);
      setCheckedTasks(new Set(saved.checkedTasks ?? []));
      setGoalData(saved.goalData ?? INITIAL_GOAL);
      setCareerPathId(saved.careerPathId ?? null);
      setGenerated(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialPathId]);

  // ── Reopen a saved roadmap by id: owner-scoped read, NO AI call ──────────────
  useEffect(() => {
    if (!initialPathId) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("career_paths")
        .select("id, current_role, target_role, roadmap, progress")
        .eq("id", initialPathId)
        .eq("user_id", session.user.id) // defensive owner scoping on top of RLS
        .single();
      if (cancelled) return;
      if (error || !data) { showToast("Couldn't open that saved roadmap.", "error"); setLoadingSaved(false); return; }

      const row = data as Record<string, unknown>;
      const rm = (row.roadmap && typeof row.roadmap === "object" ? row.roadmap : {}) as Record<string, unknown>;
      const phases = Array.isArray(rm.phases) ? (rm.phases as RoadmapPhase[]) : [];
      if (phases.length === 0) {
        // Old/incompatible row with no stored phases — do NOT reconstruct/invent.
        showToast("This saved roadmap has no stored steps to display.", "error");
        setLoadingSaved(false);
        return;
      }
      const savedGoal = (rm.goalData && typeof rm.goalData === "object" ? rm.goalData : {}) as Partial<CareerGoalData>;
      const checks = Array.isArray(rm.checkedTasks) ? (rm.checkedTasks as string[]).filter((x) => typeof x === "string") : [];

      setAiPhases(phases);
      setCheckedTasks(new Set(checks));
      setGoalData({
        ...INITIAL_GOAL,
        ...savedGoal,
        currentTitle: typeof row.current_role === "string" ? row.current_role : (savedGoal.currentTitle ?? ""),
        targetTitle:  typeof row.target_role === "string" ? row.target_role : (savedGoal.targetTitle ?? ""),
      });
      setCareerPathId(String(row.id));
      setGenerated(true);
      setLoadingSaved(false);
      // Rebind local state to THIS saved row (overwrites any stale local roadmap).
      saveToStorage({ phases, checkedTasks: checks, goalData: { ...INITIAL_GOAL, ...savedGoal }, careerPathId: String(row.id) });
    })();
    return () => { cancelled = true; };
  }, [initialPathId, router, showToast]);

  // ── Sync checkedTasks to localStorage whenever they change ──────────────────
  useEffect(() => {
    if (generated && aiPhases.length > 0) {
      saveToStorage({
        phases:       aiPhases,
        checkedTasks: Array.from(checkedTasks),
        goalData,
        careerPathId,
      });
    }
  }, [checkedTasks, generated, aiPhases, goalData, careerPathId]);

  const handleResumeParsed = useCallback((text: string, name: string) => {
    setResumeText(text.slice(0, RESUME_TEXT_CAP));
    setFileName(name);
    showToast("Résumé parsed — its text will ground your roadmap.", "success");
  }, [showToast]);

  const clearResume = useCallback(() => { setResumeText(""); setFileName(null); }, []);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!goalData.currentTitle.trim() || !goalData.targetTitle.trim()) {
      showToast("Please enter your current and target job titles.", "error");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await authedFetch("/api/career-path/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...goalData, resumeText: resumeText || undefined }),
      });

      const data = await res.json().catch(() => ({})) as { phases?: RoadmapPhase[]; error?: string };

      if (!res.ok || data.error || !data.phases || data.phases.length === 0) {
        // Preserve the existing roadmap + progress on failure — never wipe first.
        showToast(data.error ?? "Couldn't generate your roadmap. Please try again.", "error");
        return;
      }

      // Success → the new roadmap supersedes any previous one (fresh progress).
      setAiPhases(data.phases);
      setCheckedTasks(new Set());
      setGenerated(true);
      setCareerPathId(null);
      setSaveStatus("idle");
      saveToStorage({ phases: data.phases, checkedTasks: [], goalData, careerPathId: null });
    } catch {
      showToast("Something went wrong while generating. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate discards the current roadmap + progress — gate behind a confirm.
  const requestRegenerate = () => {
    if (generated && aiPhases.length > 0) { setPendingDiscard("regen"); return; }
    void handleGenerate();
  };
  const requestEditGoals = () => {
    if (generated && aiPhases.length > 0) { setPendingDiscard("edit"); return; }
    setGenerated(false);
  };
  const confirmDiscard = () => {
    const action = pendingDiscard;
    setPendingDiscard(null);
    if (action === "regen") { void handleGenerate(); }
    else if (action === "edit") {
      // Return to the goal form, preserving the form inputs; drop the roadmap.
      setGenerated(false);
      setAiPhases([]);
      setCheckedTasks(new Set());
      setCareerPathId(null);
      clearStorage();
    }
  };

  // ── Toggle checkbox ─────────────────────────────────────────────────────────
  const toggleTask = (key: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Save to Supabase ────────────────────────────────────────────────────────
  // Owner-scoped delete of the saved roadmap (explicit confirm handled in UI).
  const handleDeleteSaved = async () => {
    if (!careerPathId) return;
    setIsDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { error } = await supabase
      .from("career_paths")
      .delete()
      .eq("id", careerPathId)
      .eq("user_id", session.user.id);
    setIsDeleting(false);
    if (error) { showToast("Couldn't delete this saved roadmap.", "error"); return; }
    clearStorage();
    showToast("Saved roadmap deleted.", "success");
    router.push("/dashboard");
  };

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
      const { error } = await supabase.from("career_paths").update(payload).eq("id", careerPathId).eq("user_id", session.user.id);
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from("career_paths").insert(payload).select("id").single();
      dbError = error;
      if (!error && data) setCareerPathId((data as { id: string }).id);
    }

    if (dbError) {
      setSaveStatus("idle");
      showToast("Couldn't save your roadmap. Please try again.", "error");
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
  if (initialPathId && loadingSaved) {
    return (
      <>
        <CareerPathHero />
        <div className="section-divider" />
        <section className="py-24 text-center"><p className="text-sm text-slate-400">Loading your saved roadmap…</p></section>
      </>
    );
  }

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
              <CareerPathUpload fileName={fileName} onParsed={handleResumeParsed} onClear={clearResume} onError={(m) => showToast(m, "error")} />
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

              {/* ── Discard confirmation (regenerate / edit goals) ── */}
              {pendingDiscard && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.25)" }}>
                  <p className="text-xs text-pink-200 flex-1">
                    {pendingDiscard === "regen"
                      ? "Regenerating replaces this roadmap and clears your checked-off progress. Continue?"
                      : "Editing goals discards this roadmap and its progress. Continue?"}
                  </p>
                  <button type="button" onClick={() => setPendingDiscard(null)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>Cancel</button>
                  <button type="button" onClick={confirmDiscard} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.35)", color: "#f9a8d4" }}>Continue</button>
                </div>
              )}

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
                    <p className="text-[10px] text-slate-600 mt-1">AI-suggested guidance · timings are estimates, not guarantees</p>
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
                    onClick={requestEditGoals}
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
                  onClick={requestRegenerate}
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

              {/* ── Delete saved roadmap (owner-scoped, confirmed) ── */}
              {careerPathId && (
                confirmDelete ? (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
                    <button type="button" onClick={handleDeleteSaved} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>{isDeleting ? "Deleting…" : "Delete permanently"}</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90" style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>Delete saved roadmap</button>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
