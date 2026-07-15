"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/formatRelative";
import {
  readWorkflowResults,
  WORKFLOW_RESULTS_KEY,
  WORKFLOW_UPDATED_EVENT,
  type WorkflowResults,
} from "@/lib/workflowResults";
import { readRecentWorkflowRuns, type WorkflowRunRow, type WorkflowJobMatch } from "@/lib/workflowRun";

// Map a Supabase workflow_runs row onto the same shape the Dashboard already
// uses for stats + recent activity (keeps the UI unchanged).
function mapRunRowToResults(row: WorkflowRunRow): WorkflowResults {
  const jm = (row.job_match ?? {}) as { count?: number; matches?: WorkflowJobMatch[] };
  const iv = (row.interview ?? {}) as { questions?: unknown };
  const interviewQuestions = Array.isArray(iv.questions)
    ? (iv.questions as unknown[]).filter((q): q is string => typeof q === "string")
    : [];
  const matches = Array.isArray(jm.matches) ? jm.matches : [];
  return {
    resumeOptimized: true,
    atsScore: row.ats_score ?? 0,
    coverLetterGenerated: Boolean(row.cover_letter?.coverLetter?.trim()),
    jobMatchesCount: typeof jm.count === "number" ? jm.count : matches.length,
    interviewSessionCreated: true,
    tasksCreated: 2,
    completedAt: row.completed_at,
    source: row.source ?? undefined,
    resumeName: row.resume_name ?? undefined,
    resumePreview: row.resume_preview ?? undefined,
    coverLetterTitle: row.cover_letter?.title,
    coverLetterText: row.cover_letter?.coverLetter,
    jobMatches: matches,
    interviewQuestions,
    detectedSkills: row.analysis?.detectedSkills,
    missingSkills: row.analysis?.missingSkills,
    strengths: row.analysis?.strengths,
    recommendations: row.analysis?.recommendations,
    profession: row.profession ?? row.analysis?.profession ?? undefined,
    resumeLanguage: row.resume_language ?? undefined,
  };
}
import DashboardSidebar from "@/app/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import QuickStats from "@/app/components/dashboard/QuickStats";
import RecentActivity from "@/app/components/dashboard/RecentActivity";
import CoverLetterWidget from "@/app/components/dashboard/CoverLetterWidget";
import WorkflowStatusCard from "@/app/components/dashboard/WorkflowStatusCard";
import RoadmapNextSteps, { hasRoadmap } from "@/app/components/dashboard/RoadmapNextSteps";
import QuickActions from "@/app/components/dashboard/QuickActions";
import SavedResumes from "@/app/components/dashboard/SavedResumes";
import SavedCoverLetters from "@/app/components/dashboard/SavedCoverLetters";
import JobMatchesWidget from "@/app/components/dashboard/JobMatchesWidget";
import PreparedApplications from "@/app/components/dashboard/PreparedApplications";
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
  content: string;
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
  // Optional AI-recommendation detail (present for workflow-derived matches).
  why?: string;
  matchedStrengths?: string[];
  missingSkills?: string[];
  recommendedSkills?: string[];
  // ── Real provider meta (present for live jobs) ──
  location?: string | null;
  remote?: boolean;
  jobTypes?: string[];
  publishedAt?: string | null;
  /** Real provider listing URL (present for live jobs). Opens externally. */
  sourceUrl?: string;
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
  const [displayName, setDisplayName] = useState<string | null>(null);
  // Auth gating: null = still checking, true/false = resolved.
  const [authed, setAuthed]           = useState<boolean | null>(null);

  const [resumes, setResumes]               = useState<ResumeRow[]>([]);
  const [coverLetters, setCoverLetters]     = useState<CoverLetterRow[]>([]);
  const [interviews, setInterviews]         = useState<InterviewRow[]>([]);
  const [jobMatches, setJobMatches]         = useState<JobMatchRow[]>([]);
  const [careerPath, setCareerPath]         = useState<CareerPathRow | null>(null);
  const [languageCount, setLanguageCount]   = useState(0);
  // Latest AI Workflow run (drives the run-specific widgets).
  const [workflow, setWorkflow]             = useState<WorkflowResults | null>(null);
  // Previous runs (kept so history stays visible in Recent Activity).
  const [pastRuns, setPastRuns]             = useState<WorkflowResults[]>([]);

  const load = useCallback(async () => {
      // ── Auth gate: no session → no personal data, show CTA. ───────────────
      let session = null;
      try {
        session = (await supabase.auth.getSession()).data.session;
      } catch {
        // Can't verify a session → treat as unauthenticated (never hang).
        setAuthed(false);
        return;
      }
      if (!session) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const uid = session.user.id;

      // Real profile for the header (falls back to the email local-part).
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", uid)
        .maybeSingle();
      const email = profile?.email ?? session.user.email ?? null;
      setUserEmail(email);
      setDisplayName(
        profile?.full_name?.trim() ||
          (email ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : null)
      );

      // Latest run: read BOTH stores and show whichever finished most recently.
      // A run may persist to Supabase, to localStorage, or (best-effort) both;
      // reading Supabase-first unconditionally could surface a STALE older row
      // and hide a fresh run that only reached localStorage. Compare timestamps
      // so the Dashboard always reflects the most recent completed run.
      const recentRows = await readRecentWorkflowRuns(10);
      const remoteMappedList = recentRows.map(mapRunRowToResults);
      const remoteMapped = remoteMappedList[0] ?? null;
      const localRun = readWorkflowResults();
      const timeOf = (r: WorkflowResults | null) =>
        r ? new Date(r.completedAt).getTime() || 0 : -1;
      const latestRun =
        timeOf(localRun) > timeOf(remoteMapped) ? localRun : remoteMapped;
      // Keep every OTHER run as history (never overwritten — each run is its own
      // row), excluding whichever run is currently shown as the latest.
      setPastRuns(
        remoteMappedList.filter((r) => r.completedAt !== latestRun?.completedAt)
      );
      // STEP 6 — the runId the dashboard is actually displaying (proves it is
      // the latest current run, not a stale Supabase/localStorage row).
      if (latestRun) {
        console.log(
          "[CareerAI] STEP 6 dashboard displaying runId:", latestRun.runId ?? "(remote row — no runId)",
          "| completedAt:", latestRun.completedAt,
          "| atsScore:", latestRun.atsScore,
          "| stored job match count:", (latestRun.jobMatches ?? []).length,
          "| firstId:", latestRun.jobMatches?.[0]?.externalId ?? "(none)",
          "| store:", timeOf(localRun) > timeOf(remoteMapped) ? "localStorage" : "supabase"
        );
      } else {
        console.log("[CareerAI] STEP 6 dashboard displaying runId: (no run found) | stored job match count: 0");
      }
      setWorkflow(latestRun);

      const [resumesRes, coversRes, interviewsRes, matchesRes, pathsRes, transRes] =
        await Promise.all([
          supabase
            .from("resumes")
            .select("id, title, language, template_name, ats_score, updated_at")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false }),

          supabase
            .from("cover_letters")
            .select("id, company_name, job_title, language, content, updated_at")
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
  }, []);

  // Load on mount AND re-load whenever a run completes (same-tab event or
  // cross-tab storage change) or the tab regains focus — so the Dashboard never
  // shows a stale first-load snapshot after a new resume is processed.
  useEffect(() => {
    let mounted = true;
    const reload = () => { if (mounted) load(); };
    // Initial load scheduled as a microtask (not a synchronous setState call).
    Promise.resolve().then(reload);
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    const onStorage = (e: StorageEvent) => { if (e.key === WORKFLOW_RESULTS_KEY) reload(); };
    window.addEventListener(WORKFLOW_UPDATED_EVENT, reload);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener(WORKFLOW_UPDATED_EVENT, reload);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

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

  // Previous runs — kept visible so history isn't lost when a new run is added.
  const historyActivities: ActivityItem[] = pastRuns.map((r, i) => ({
    id: `wf-hist-${i}`,
    action: "Resume analyzed",
    detail: `${r.resumeName ? `${r.resumeName} · ` : ""}ATS ${r.atsScore}/100${
      r.jobMatches?.[0]?.title ? ` · ${r.jobMatches[0].title}` : ""
    }`,
    timestamp: r.completedAt,
    type: "resume" as const,
  }));

  const activities: ActivityItem[] = [
    ...workflowActivities,
    ...historyActivities,
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
    .slice(0, 10);

  // ── Widget feeds: use real table rows when present, else the latest
  //    workflow run (workflow_runs) so each section reflects the run. ─────────

  // Top Job Matches — from workflow_runs.job_match when the table is empty.
  const workflowJobRows: JobMatchRow[] = (workflow?.jobMatches ?? []).map((m, i) => ({
    id: `wf-jm-${i}`,
    job_title: m.title,
    company_name: m.company ?? null,
    match_score: m.matchScore,
    created_at: workflow?.completedAt ?? new Date().toISOString(),
    why: m.whyMatch,
    matchedStrengths: m.matchedStrengths,
    missingSkills: m.missingSkills,
    recommendedSkills: m.recommendedSkills,
    location: m.location,
    remote: m.remote,
    jobTypes: m.jobTypes,
    publishedAt: m.publishedAt,
    sourceUrl: m.sourceUrl,
  }));
  // Prefer the CURRENT run's matches so a fresh upload always drives this
  // section; only fall back to saved job_matches table rows when the run has
  // none. This prevents stale table rows from masking the latest run.
  const jobMatchRows: JobMatchRow[] = workflowJobRows.length ? workflowJobRows : jobMatches;

  // Saved Resume — from the latest workflow run when the table is empty.
  const workflowResumeRows: ResumeRow[] =
    workflow && (workflow.resumeName || workflow.resumeOptimized)
      ? [
          {
            id: "wf-resume",
            title: workflow.resumeName ?? "Uploaded resume",
            language: "English (US)",
            template_name: null,
            ats_score: workflow.atsScore ?? null,
            updated_at: workflow.completedAt,
          },
        ]
      : [];
  const resumeRows: ResumeRow[] = resumes.length ? resumes : workflowResumeRows;

  // Interview questions generated by the latest run.
  const interviewQuestions: string[] = workflow?.interviewQuestions ?? [];

  // Roadmap: the workflow-derived "Next Steps" and the sidebar RoadmapWidget
  // must never both appear. Next Steps take priority when available.
  const nextStepsReady = hasRoadmap(workflow);
  // Show the sidebar roadmap only when it has real content (a saved career
  // path) OR when there are no generated Next Steps to show instead.
  const showSidebarRoadmap = Boolean(careerPath) || !nextStepsReady;

  // Saved Cover Letters — surface the latest workflow-generated letter at the
  // top (from workflow_runs) alongside any letters saved via the cover-letter page.
  const workflowCoverRows: CoverLetterRow[] =
    workflow?.coverLetterText && workflow.coverLetterText.trim()
      ? [
          {
            id: "wf-cover",
            company_name: workflow.coverLetterCompany || "Latest cover letter",
            job_title: workflow.coverLetterRole || workflow.coverLetterTitle || "Generated from your resume",
            language: "English (US)",
            content: workflow.coverLetterText,
            updated_at: workflow.completedAt,
          },
        ]
      : [];
  const coverLetterRows: CoverLetterRow[] = [...workflowCoverRows, ...coverLetters];

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

  const handleRenameResume = async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const { error } = await supabase.from("resumes").update({ title: clean }).eq("id", id);
    if (!error) {
      setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, title: clean } : r)));
    }
  };

  const handleDeleteCoverLetter = async (id: string) => {
    const { error } = await supabase.from("cover_letters").delete().eq("id", id);
    if (!error) {
      setCoverLetters((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Still checking the session — avoid flashing dashboard or CTA.
  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#05050a" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-violet-400 animate-spin" />
      </div>
    );
  }

  // Not authenticated — no personal data, just a clear sign-in CTA.
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#05050a" }}>
        <div
          className="w-full max-w-md rounded-2xl border p-8 text-center"
          style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
          >
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="9" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Your Personal Dashboard</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Sign in to access your resumes, ATS analysis, AI cover letters, interview preparation and career progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 24px rgba(124,58,237,0.3)" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border transition-colors hover:text-white"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} userEmail={userEmail} displayName={displayName} />

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
              {showSidebarRoadmap && <RoadmapWidget careerPath={careerPath} />}
            </div>
          </div>

          {/* Workflow completion status + latest generated cover letter */}
          {workflow && (
            <div className="mb-5">
              <WorkflowStatusCard workflow={workflow} />
            </div>
          )}
          {workflow && (
            <div className="mb-5">
              <CoverLetterWidget workflow={workflow} />
            </div>
          )}
          {workflow && nextStepsReady && (
            <div className="mb-5">
              <RoadmapNextSteps workflow={workflow} />
            </div>
          )}

          <div className="mb-5">
            <SavedResumes
              resumes={resumeRows}
              formatRelative={formatRelative}
              onDelete={handleDeleteResume}
              onRename={handleRenameResume}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-5">
            <JobMatchesWidget matches={jobMatchRows} formatRelative={formatRelative} />
            <InterviewWidget sessions={interviews} questions={interviewQuestions} formatRelative={formatRelative} />
          </div>

          <div className="mb-5">
            <SavedCoverLetters
              coverLetters={coverLetterRows}
              formatRelative={formatRelative}
              onDelete={handleDeleteCoverLetter}
            />
          </div>

          <div className="mb-8">
            <PreparedApplications />
          </div>

          <p className="text-xs text-slate-700 text-center pb-2">CareerAI · Your data is private and secured</p>
        </main>
      </div>
    </div>
  );
}
