"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CareerGoalData, RoadmapPhase } from "@/app/components/career-path/types";
import Toast from "@/app/components/ui/Toast";
import CareerPathHero from "@/app/components/career-path/CareerPathHero";
import CareerPathUpload from "@/app/components/career-path/CareerPathUpload";
import CareerGoalForm from "@/app/components/career-path/CareerGoalForm";

const INITIAL_GOAL: CareerGoalData = {
  currentTitle: "",
  targetTitle:  "",
  industry:     "Technology",
  country:      "",
  workStyle:    "Remote",
  experience:   "Senior",
  timeGoal:     "12 months",
};

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

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Generate roadmap ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!goalData.currentTitle.trim() || !goalData.targetTitle.trim()) {
      showToast("Please enter your current and target job titles.", "error");
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    setAiPhases([]);
    setCheckedTasks(new Set());

    try {
      const res = await fetch("/api/career-path/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(goalData),
      });

      const data = await res.json() as { phases?: RoadmapPhase[]; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Roadmap generation failed.");
      }

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

  // ── Toggle task checkbox ────────────────────────────────────────────────────
  const toggleTask = (key: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
        .from("career_paths")
        .insert(payload)
        .select("id")
        .single();
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
  const totalTasks     = aiPhases.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = checkedTasks.size;
  const progressPct    = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const progressColor =
    progressPct >= 75 ? "#10b981" :
    progressPct >= 40 ? "#f59e0b" :
    "#ec4899";

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

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-10">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Career planner
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="flex flex-col gap-5">
            {/* Upload resume */}
            <CareerPathUpload fileName={fileName} onFileChange={setFileName} />

            {/* Simplified form */}
            <CareerGoalForm
              data={goalData}
              onChange={setGoalData}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />

            {/* Roadmap — shown after generation */}
            {generated && aiPhases.length > 0 && (
              <div className="flex flex-col gap-4 mt-2">

                {/* Progress header */}
                <div
                  className="rounded-2xl border px-5 py-4"
                  style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: progressColor }}
                      />
                      <span className="text-sm font-semibold text-white">Roadmap Progress</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: progressColor }}>
                      {progressPct}%
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, #be185d, ${progressColor})` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {completedTasks} of {totalTasks} tasks completed
                    {goalData.currentTitle && goalData.targetTitle && (
                      <> · {goalData.currentTitle} <span className="text-slate-700 mx-1">→</span> {goalData.targetTitle}</>
                    )}
                  </p>
                </div>

                {/* Phase cards */}
                {aiPhases.map((phase) => (
                  <div
                    key={phase.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    {/* Phase header */}
                    <div
                      className="flex items-center gap-3 px-5 py-3.5 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.06)", background: `${phase.bg}` }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${phase.color}22`, border: `1px solid ${phase.color}55`, color: phase.color }}
                      >
                        {phase.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white">{phase.title}</span>
                        <span className="text-xs text-slate-500 ml-2">{phase.months}</span>
                      </div>
                      {/* Phase completion indicator */}
                      {phase.tasks.length > 0 && (
                        <span className="text-[10px] font-medium tabular-nums" style={{ color: phase.color }}>
                          {phase.tasks.filter((_, i) => checkedTasks.has(`${phase.id}-${i}`)).length}/{phase.tasks.length}
                        </span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="px-5 py-4 flex flex-col gap-3">
                      {phase.tasks.map((task, i) => {
                        const key = `${phase.id}-${i}`;
                        const checked = checkedTasks.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleTask(key)}
                            className="flex items-center gap-3 text-left w-full group transition-opacity duration-150"
                            style={{ opacity: checked ? 0.55 : 1 }}
                          >
                            {/* Checkbox */}
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200"
                              style={{
                                background: checked ? phase.color : "rgba(255,255,255,0.04)",
                                border:     `1.5px solid ${checked ? phase.color : "rgba(255,255,255,0.15)"}`,
                              }}
                            >
                              {checked && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            {/* Task text */}
                            <span
                              className="text-sm leading-snug transition-colors duration-150"
                              style={{ color: checked ? "#475569" : "#cbd5e1", textDecoration: checked ? "line-through" : "none" }}
                            >
                              {task}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Save + Regenerate row */}
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveStatus === "saving"}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: saveStatus === "saved"
                        ? "rgba(16,185,129,0.15)"
                        : "linear-gradient(135deg, #be185d, #ec4899)",
                      boxShadow: saveStatus === "saved" ? "none" : "0 0 24px rgba(236,72,153,0.25)",
                    }}
                  >
                    {saveStatus === "saving" ? (
                      <>
                        <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.75" />
                          <path d="M7.5 1.5a6 6 0 016 6" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
                        </svg>
                        Saving…
                      </>
                    ) : saveStatus === "saved" ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ color: "#6ee7b7" }}>Saved to Dashboard</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2 2h8.5L13 4.5V13H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                          <rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="white" strokeWidth="1.25" />
                          <rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="white" strokeWidth="1.25" />
                        </svg>
                        Save Roadmap
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                      <path d="M11.5 2.5A5.5 5.5 0 101.5 7" /><path d="M1.5 3.5V7h3.5" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
