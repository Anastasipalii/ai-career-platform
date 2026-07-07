"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/formatRelative";
import { readWorkflowResults, type WorkflowResults } from "@/lib/workflowResults";
import { readLatestWorkflowRun, type WorkflowRunRow } from "@/lib/workflowRun";

// Map a Supabase workflow_runs row onto the same shape the Dashboard already
// uses for stats + recent activity (keeps the UI unchanged).
function mapRunRowToResults(row: WorkflowRunRow): WorkflowResults {
  const jm = (row.job_match ?? {}) as { count?: number };
  return {
    resumeOptimized: true,
    atsScore: row.ats_score ?? 0,
    coverLetterGenerated: Boolean(row.cover_letter),
    jobMatchesCount: typeof jm.count === "number" ? jm.count : 8,
    interviewSessionCreated: true,
    tasksCreated: 2,
    completedAt: row.completed_at,
    source: row.source ?? undefined,
    resumeName: row.resume_name ?? undefined,
    resumePreview: row.resume_preview ?? undefined,
    coverLetterTitle: row.cover_letter?.title,
    coverLetterText: row.cover_letter?.coverLetter,
  };
}
import DashboardSidebar from "@/app/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import QuickStats from "@/app/components/dashboard/QuickStats";
import RecentActivity from "@/app/components/dashboard/RecentActivity";
import CoverLetterWidget from "@/app/components/dashboard/CoverLetterWidget";
import QuickActions from "@/app/components/dashboard/QuickActions";
import SavedResumes from "@/app/components/dashboard/SavedResumes";
import SavedCoverLetters from "@/app/components/dashboard/SavedCoverLetters";
import JobMatchesWidget from "@/app/components/dashboard/JobMatchesWidget";
import RoadmapWidget from "@/app/components/dashboard/RoadmapWidget";
import InterviewWidget from "@/app/components/dashboard/InterviewWidget";

// ── Row shapes (mirror DB columns selected below) ──────────────────────────

export interface ResumeRow {
  id: string;
  title: string;
  language: string;
  template_name: string | null;
  ats_score: number | null;
  updated_at: string;
}

export interface CoverLetterRow {
  id: string;
  company_name: string;
  job_title: string;
  language: string;
  updated_at: string;
}

export interface InterviewRow {
  id: string;
  interview_type: string;
  job_title: string | null;
  score: number | null;
  created_at: string;
}

export interface JobMatchRow {
  id: string;
  job_title: string;
  company_name: string | null;
  match_score: number | null;
  created_at: string;
}

export interface CareerPathRow {
  id: string;
  current_role: string;
  target_role: string;
  progress: number;
  updated_at: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  type: "resume" | "cover_letter" | "interview" | "job_match" | "task";
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail]     = useState<string | null>(null);

  const [resumes, setResumes]               = useState<ResumeRow[]>([]);
  const [coverLetters, setCoverLetters]     = useState<CoverLetterRow[]>([]);
  const [interviews, setInterviews]         = useState<InterviewRow[]>([]);
  const [jobMatches, setJobMatches]         = useState<JobMatchRow[]>([]);
  const [careerPath, setCareerPath]         = useState<CareerPathRow | null>(null);
  const [languageCount, setLanguageCount]   = useState(0);
  // Frontend-only mock: results from the latest AI Workflow run (localStorage).
  const [workflow, setWorkflow]             = useState<WorkflowResults | null>(null);

  useEffect(() => {
    async function load() {
      // Immediate fallback: the localStorage mock run (client-side, SSR-safe).
      const localRun = readWorkflowResults();
      if (localRun) setWorkflow(localRun);
      // ── DIAGNOSTIC (no behavior change) ───────────────────────────────────
      console.log("[CareerAI] 8. dashboard read — localStorage run present?:", !!localRun, "| source:", localRun?.source ?? "(none)", "| completedAt:", localRun?.completedAt ?? "(none)");
      // ──────────────────────────────────────────────────────────────────────

      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email ?? null);
      if (!session) return;
      const uid = session.user.id;

      // Prefer the latest persisted run from Supabase when available.
      const remoteRun = await readLatestWorkflowRun();
      console.log("[CareerAI] 8. dashboard read — Supabase latest workflow_run present?:", !!remoteRun, "| source:", remoteRun?.source ?? "(none)", "| completedAt:", remoteRun?.completed_at ?? "(none)", "→ using:", remoteRun ? "SUPABASE latest" : localRun ? "localStorage" : "none");
      if (remoteRun) setWorkflow(mapRunRowToResults(remoteRun));

      const [resumesRes, coversRes, interviewsRes, matchesRes, pathsRes, transRes] =
        await Promise.all([
          supabase
            .from("resumes")
            .select("id, title, language, template_name, ats_score, updated_at")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false }),

          supabase
            .from("cover_letters")
            .select("id, company_name, job_title, language, updated_at")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false }),

          supabase
            .from("interview_sessions")
            .select("id, interview_type, job_title, score, created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false }),

          supabase
            .from("job_matches")
            .select("id, job_title, company_name, match_score, created_at")
            .eq("user_id", uid)
            .order("match_score", { ascending: false }),

          supabase
            .from("career_paths")
            .select("id, current_role, target_role, progress, updated_at")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false })
            .limit(1),

          supabase
            .from("translations")
            .select("target_language")
            .eq("user_id", uid),
        ]);

      setResumes((resumesRes.data ?? []) as ResumeRow[]);
      setCoverLetters((coversRes.data ?? []) as CoverLetterRow[]);
      setInterviews((interviewsRes.data ?? []) as InterviewRow[]);
      setJobMatches((matchesRes.data ?? []) as JobMatchRow[]);
      setCareerPath(((pathsRes.data ?? [])[0] as CareerPathRow) ?? null);

      const uniqueLangs = new Set(
        (transRes.data ?? []).map((t: { target_language: string }) => t.target_language)
      );
      setLanguageCount(uniqueLangs.size);
    }
    load();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const scoredResumes = resumes.filter((r) => r.ats_score !== null);
  // Fold the workflow's ATS score into the average when present.
  const atsSamples = [
    ...scoredResumes.map((r) => r.ats_score ?? 0),
    ...(workflow?.resumeOptimized ? [workflow.atsScore] : []),
  ];
  const avgAts =
    atsSamples.length > 0
      ? Math.round(atsSamples.reduce((sum, s) => sum + s, 0) / atsSamples.length)
      : null;

  // Counts shown in QuickStats, augmented by the latest workflow run.
  const resumeCount = resumes.length + (workflow?.resumeOptimized ? 1 : 0);
  const coverLetterCount = coverLetters.length + (workflow?.coverLetterGenerated ? 1 : 0);
  const interviewCount = interviews.length + (workflow?.interviewSessionCreated ? 1 : 0);
  const jobMatchCount = jobMatches.length + (workflow?.jobMatchesCount ?? 0);

  // Recent-activity entries synthesized from the workflow run (localStorage).
  // Small per-item offsets keep them in a stable, readable order at the top.
  const workflowActivities: ActivityItem[] = workflow
    ? (() => {
        const base = new Date(workflow.completedAt).getTime();
        const at = (i: number) => new Date(base - i * 1000).toISOString();
        const items: ActivityItem[] = [];
        if (workflow.resumeOptimized)
          items.push({ id: "wf-resume", action: "Resume optimized", detail: `${workflow.resumeName ? `${workflow.resumeName} · ` : ""}ATS score ${workflow.atsScore}/100`, timestamp: at(0), type: "resume" });
        if (workflow.coverLetterGenerated)
          items.push({ id: "wf-cover", action: "Cover letter generated", detail: workflow.coverLetterTitle || [workflow.coverLetterRole, workflow.coverLetterCompany].filter(Boolean).join(" · ") || "Tailored draft ready", timestamp: at(1), type: "cover_letter" });
        if (workflow.jobMatchesCount > 0)
          items.push({ id: "wf-matches", action: "Job matches found", detail: `${workflow.jobMatchesCount} roles matched`, timestamp: at(2), type: "job_match" });
        if (workflow.interviewSessionCreated)
          items.push({ id: "wf-interview", action: "Interview session created", detail: "Mock interview ready to practice", timestamp: at(3), type: "interview" });
        if (workflow.tasksCreated > 0)
          items.push({ id: "wf-tasks", action: "Tasks created", detail: `${workflow.tasksCreated} follow-up${workflow.tasksCreated !== 1 ? "s" : ""} scheduled`, timestamp: at(4), type: "task" });
        return items;
      })()
    : [];

  const activities: ActivityItem[] = [
    ...workflowActivities,
    ...resumes.map((r) => ({
      id: r.id,
      action: "Resume saved",
      detail: r.title,
      timestamp: r.updated_at,
      type: "resume" as const,
    })),
    ...coverLetters.map((c) => ({
      id: c.id,
      action: "Cover letter created",
      detail: `${c.company_name} · ${c.job_title}`,
      timestamp: c.updated_at,
      type: "cover_letter" as const,
    })),
    ...interviews.map((i) => ({
      id: i.id,
      action: "Interview practice",
      detail: `${i.interview_type}${i.score != null ? ` · Score: ${i.score}/100` : ""}`,
      timestamp: i.created_at,
      type: "interview" as const,
    })),
    ...jobMatches.map((m) => ({
      id: m.id,
      action: "Job match found",
      detail: `${m.job_title}${m.company_name ? ` at ${m.company_name}` : ""}`,
      timestamp: m.created_at,
      type: "job_match" as const,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteResume = async (id: string) => {
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (!error) {
      setResumes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex" style={{ background: "#05050a" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 z-10 border-r"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(9,9,16,0.98)" }}
      >
        <DashboardSidebar activePath="/dashboard" userEmail={userEmail} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-60 z-50 border-r"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(9,9,16,0.99)" }}
          >
            <DashboardSidebar
              activePath="/dashboard"
              userEmail={userEmail}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-60 min-w-0">
        <main className="px-4 sm:px-6 lg:px-8 py-7 max-w-[1400px]">

          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} userEmail={userEmail} />

          <QuickStats
            resumeCount={resumeCount}
            coverLetterCount={coverLetterCount}
            interviewCount={interviewCount}
            jobMatchCount={jobMatchCount}
            languageCount={languageCount}
            avgAtsScore={avgAts}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 mb-5">
            <RecentActivity activities={activities} formatRelative={formatRelative} />
            <div className="flex flex-col gap-5">
              <QuickActions />
              <RoadmapWidget careerPath={careerPath} />
            </div>
          </div>

          {/* Latest generated cover letter from the newest workflow run */}
          {workflow && (
            <div className="mb-5">
              <CoverLetterWidget workflow={workflow} />
            </div>
          )}

          <div className="mb-5">
            <SavedResumes
              resumes={resumes}
              formatRelative={formatRelative}
              onDelete={handleDeleteResume}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-5">
            <JobMatchesWidget matches={jobMatches} formatRelative={formatRelative} />
            <InterviewWidget sessions={interviews} formatRelative={formatRelative} />
          </div>

          <div className="mb-8">
            <SavedCoverLetters coverLetters={coverLetters} formatRelative={formatRelative} />
          </div>

          <p className="text-xs text-slate-700 text-center pb-2">CareerAI · Your data is private and secured</p>
        </main>
      </div>
    </div>
  );
}
