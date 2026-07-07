"use client";

import { useMemo, useRef, useState } from "react";
import { FLOW_STEPS, type WorkflowStepStatus } from "./flowSteps";
import { usePipeline } from "./usePipeline";
import { MOCK_OUTPUTS, type WorkflowOutputs, type JobMatch } from "./mockOutputs";
import { saveWorkflowResults } from "@/lib/workflowResults";
import {
  saveWorkflowRun,
  type ResultSource,
  type ResumeAnalysis,
  type CoverLetterResult,
} from "@/lib/workflowRun";
import ResumeInputPanel from "./ResumeInputPanel";
import WorkflowNode from "./WorkflowNode";
import WorkflowConnector from "./WorkflowConnector";
import NodeDetailPanel from "./NodeDetailPanel";
import WorkflowResults from "./WorkflowResults";
import WorkflowDashboardSync from "./WorkflowDashboardSync";

const clamp100 = (n: number) => Math.min(100, Math.max(0, Math.round(n || 0)));

interface AiRunResult {
  source: ResultSource;
  outputs: WorkflowOutputs;
  analysis: ResumeAnalysis | null;
  cover: CoverLetterResult | null;
}

// Map real AI results onto the existing WorkflowOutputs shape. Fields the
// agents don't produce (resume bullets, interview questions) keep the mock so
// the results UI is never left blank. No hardcoded company/role — the cover
// letter card shows role/company only when they're actually known.
function mapToOutputs(
  analysis: ResumeAnalysis | null,
  cover: CoverLetterResult | null,
  jobMatches: JobMatch[],
  interviewQuestions: string[],
  role: string
): WorkflowOutputs {
  const score = analysis ? clamp100(analysis.atsScore) : MOCK_OUTPUTS.ats.score;
  return {
    ats: {
      score,
      verdict:
        score >= 80
          ? "Strong — likely to pass most ATS filters"
          : score >= 60
          ? "Moderate — some tuning recommended"
          : "Needs work — optimize before applying",
      subScores: MOCK_OUTPUTS.ats.subScores,
    },
    missingSkills: analysis?.missingSkills?.length ? analysis.missingSkills : MOCK_OUTPUTS.missingSkills,
    resumeBullets: MOCK_OUTPUTS.resumeBullets,
    coverLetter: {
      role: role || "",
      company: "",
      preview: cover?.coverLetter || MOCK_OUTPUTS.coverLetter.preview,
    },
    jobMatches: jobMatches.length ? jobMatches : MOCK_OUTPUTS.jobMatches,
    interviewQuestions: interviewQuestions.length ? interviewQuestions : MOCK_OUTPUTS.interviewQuestions,
  };
}

// POST JSON with a hard timeout so a stalled network can never hang the run.
async function postJson(
  url: string,
  body: unknown,
  timeoutMs = 20000
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort name detection from the top of a resume (first plausible line).
function guessCandidateName(resumeText: string): string {
  const firstLine = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean) ?? "";
  const looksLikeName =
    /^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*){1,3}$/.test(firstLine) &&
    firstLine.length <= 40 &&
    !/[\d@]/.test(firstLine);
  return looksLikeName ? firstLine : "";
}

// Infers a target role from the resume text / analysis. Never returns empty —
// falls back to "Junior Frontend Developer" when nothing can be inferred.
function inferTargetRole(resumeText: string, analysis: ResumeAnalysis | null): string {
  const titleRe =
    /(senior|junior|lead|staff|principal|mid[- ]?level)?\s*(frontend|front-end|backend|back-end|full[- ]?stack|software|web|mobile|data|product|ux|ui|devops|machine learning|ml|ai)\s+(developer|engineer|designer|manager|analyst|scientist)/i;
  const m = resumeText.match(titleRe);
  if (m) {
    return m[0].replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const hay = ((analysis?.detectedSkills ?? []).join(" ") + " " + resumeText).toLowerCase();
  if (/\breact\b|vue|angular|tailwind|\bcss\b|frontend|front-end/.test(hay)) return "Frontend Developer";
  if (/node|express|django|flask|\bapi\b|backend|back-end|\bsql\b|postgres/.test(hay)) return "Backend Developer";
  if (/product manager|roadmap|stakeholder|prioriti/.test(hay)) return "Product Manager";
  if (/figma|\bux\b|\bui\b|wireframe|prototype/.test(hay)) return "Product Designer";
  if (/\bdata\b|pandas|machine learning|\bml\b|analytics/.test(hay)) return "Data Analyst";
  return "Junior Frontend Developer";
}

// Builds a useful, NON-EMPTY job description from the resume context when the
// user didn't paste one. Combines target role, resume summary, skills, and the
// top job-match context so the cover letter always has something to tailor to.
function buildJobDescription(
  role: string,
  analysis: ResumeAnalysis | null,
  topMatch: JobMatch | undefined,
  userJobDescription: string
): string {
  if (userJobDescription.trim()) return userJobDescription.trim();
  const summary = analysis?.experienceSummary?.trim();
  const skills = (analysis?.detectedSkills ?? []).slice(0, 10).join(", ");
  const focus = topMatch?.whyMatch?.trim();
  return [
    `Target role: ${role}.`,
    summary ? `Candidate background: ${summary}` : "",
    skills ? `Relevant skills: ${skills}.` : "",
    `Responsibilities: contribute as a ${role} by building high-quality work, collaborating across teams, and delivering measurable impact.`,
    focus ? `Why this fits the candidate: ${focus}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Builds a professional cover letter LOCALLY from the actual resume text.
// Used only when live AI is unavailable but resume text exists — so the letter
// is grounded in the candidate's own content, never a hardcoded demo.
function buildLocalCoverLetter(
  resumeText: string,
  role: string,
  analysis: ResumeAnalysis | null
): CoverLetterResult {
  const name = guessCandidateName(resumeText);
  const excerpt = resumeText.replace(/\s+/g, " ").trim().slice(0, 320);
  const skills = (analysis?.detectedSkills ?? []).slice(0, 6);
  const strengths = (analysis?.strengths ?? []).slice(0, 3);
  const targetRole = role && role.trim() ? role : "the role";

  const body =
    `Dear Hiring Manager,\n\n` +
    `I am writing to express my strong interest in the ${targetRole} position. ` +
    `${name ? `My name is ${name}, and ` : ""}I bring a track record of delivering measurable results and ` +
    `collaborating closely with cross-functional teams, as reflected throughout my resume.\n\n` +
    (skills.length ? `My core strengths include ${skills.join(", ")}. ` : "") +
    (strengths.length ? `I've been recognized for ${strengths.join(", ").toLowerCase()}. ` : "") +
    `A snapshot from my background: ${excerpt}${excerpt.length >= 320 ? "…" : ""}\n\n` +
    `I take ownership of initiatives end to end — scoping the problem, shipping iteratively, and using data to ` +
    `confirm the impact. I care about clear communication, pragmatic trade-offs, and raising the quality bar of the ` +
    `work I touch.\n\n` +
    `I'm confident my experience maps closely to what this ${targetRole} role requires, and I would welcome the ` +
    `opportunity to contribute quickly to your team's goals. Thank you for considering my application; I would be ` +
    `glad to discuss how my background fits what you're looking for.\n\n` +
    `Sincerely,${name ? `\n${name}` : ""}`;

  return {
    title: name ? `Cover Letter — ${name}, ${targetRole}` : `Cover Letter — ${targetRole}`,
    coverLetter: body,
    matchingKeywords: skills,
    toneSuggestions: ["Professional", "Confident", "Warm"],
  };
}

// Runs the real AI agents from the candidate's own resume (primary context)
// and an optional job description. Always resolves (never throws) — any failure
// yields a demo-fallback result so the pipeline UI keeps working.
async function runRealAI(resumeText: string, jobDescription: string): Promise<AiRunResult> {
  const fallback: AiRunResult = {
    source: "demo-fallback",
    outputs: MOCK_OUTPUTS,
    analysis: null,
    cover: null,
  };
  try {
    // 1) Resume analysis — only when an actual resume was provided.
    let analysis: ResumeAnalysis | null = null;
    let analysisLive = false;
    if (resumeText) {
      const aJson = await postJson("/api/resume/analyze", { resumeText });
      analysis = (aJson.data as ResumeAnalysis | undefined) ?? null;
      analysisLive = aJson.source === "live-ai";
    }

    // 2) Target role — always inferred (never empty). Used for job matches,
    //    the built job description, and interview questions.
    const inferredRole = inferTargetRole(resumeText, analysis);

    // 3) Job matches — anchored to a valid target role.
    const jJson = await postJson("/api/job-match/agent", {
      resumeText,
      jobDescription,
      targetRole: inferredRole,
      analysis: analysis ?? undefined,
    });
    const matches = (jJson.data as { matches?: JobMatch[] } | undefined)?.matches ?? [];

    // Final role prefers the strongest match's title, else the inferred role.
    const role = matches[0]?.title || inferredRole;

    // 4) Job description — never empty; built from resume + role + skills + match.
    const builtJobDescription = buildJobDescription(role, analysis, matches[0], jobDescription);

    // 5) Cover letter — resume-primary, tailored to the (always non-empty) JD.
    const cJson = await postJson("/api/cover-letter/agent", {
      resumeText,
      jobDescription: builtJobDescription,
      analysis: analysis ?? undefined,
      tone: "Professional",
    });
    const apiCover = (cJson.data as CoverLetterResult | undefined) ?? null;
    const coverLive = cJson.source === "live-ai";

    // ── DIAGNOSTIC (no behavior change) ─────────────────────────────────────
    console.log("[CareerAI] runRealAI received resumeText length:", resumeText.length, "| jobDescription length (built):", builtJobDescription.length, "| target role:", role);
    console.log("[CareerAI] 4/5. /api/resume/analyze source:", analysisLive ? "live-ai" : "demo-fallback (OpenAI NOT called — key missing or error)");
    console.log("[CareerAI] 4/5. /api/cover-letter/agent source:", coverLive ? "live-ai" : "demo-fallback (OpenAI NOT called — key missing or error)");
    console.log("[CareerAI] 6. cover letter generated from:", coverLive ? "AI (live)" : resumeText ? "LOCAL resume-based fallback" : "generic mock (no resume text)");
    // ────────────────────────────────────────────────────────────────────────

    // Live AI didn't produce the letter but resume text exists → build it
    // locally from the resume text (never the hardcoded demo).
    const cover: CoverLetterResult | null = coverLive
      ? apiCover
      : resumeText
      ? buildLocalCoverLetter(resumeText, role, analysis)
      : apiCover;

    if (!cover) return fallback;

    // 6) Interview questions — role-specific.
    const qJson = await postJson("/api/interview/generate", {
      jobTitle: role,
      jobDescription: builtJobDescription,
      mode: "quick",
      language: "English (US)",
    });
    const questions = ((qJson.questions as { question?: string }[] | undefined) ?? [])
      .map((q) => q.question?.trim() ?? "")
      .filter(Boolean);

    // "Live" only when everything attempted came back from live AI.
    const live = coverLive && (resumeText ? analysisLive : true);
    return {
      source: live ? "live-ai" : "demo-fallback",
      outputs: mapToOutputs(analysis, cover, matches, questions, role),
      analysis,
      cover,
    };
  } catch {
    return fallback;
  }
}

export default function WorkflowCanvas() {
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Optional resume input — empty means the pure demo run (unchanged).
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  // Optional job description — tailors the cover letter and job matches.
  const [jobDescription, setJobDescription] = useState("");

  // Real-AI results for the current run (null → mock demo).
  const [aiResults, setAiResults] = useState<WorkflowOutputs | null>(null);
  const [aiSource, setAiSource] = useState<ResultSource | null>(null);
  const aiPromiseRef = useRef<Promise<AiRunResult> | null>(null);

  // Persist a completed run to localStorage (always) + Supabase (best-effort).
  const persistRun = (
    outputs: WorkflowOutputs,
    source: ResultSource | null,
    analysis: ResumeAnalysis | null,
    cover: CoverLetterResult | null
  ) => {
    const completedAt = new Date().toISOString();
    // A run "used a resume" if text was pasted OR a file was uploaded.
    const usedResume = resumeText.trim().length > 0 || !!resumeFileName;
    const resolvedSource: ResultSource = source ?? "demo-fallback";

    saveWorkflowResults({
      resumeOptimized: true,
      atsScore: clamp100(outputs.ats.score),
      coverLetterGenerated: true,
      jobMatchesCount: outputs.jobMatches.length,
      interviewSessionCreated: true,
      tasksCreated: 2,
      completedAt,
      source: resolvedSource,
      resumeName: usedResume ? resumeFileName ?? "Pasted resume" : undefined,
      resumePreview: usedResume ? resumeText.slice(0, 300) : undefined,
      coverLetterTitle: cover?.title,
      coverLetterText: outputs.coverLetter.preview,
    });

    // Best-effort DB write — no-ops without a session, never blocks the UI.
    const analysisRecord: ResumeAnalysis =
      analysis ?? {
        detectedSkills: [],
        detectedLanguages: [],
        experienceSummary: "",
        strengths: [],
        weaknesses: [],
        missingSkills: outputs.missingSkills,
        atsScore: clamp100(outputs.ats.score),
        recommendations: [],
      };
    const coverRecord: CoverLetterResult =
      cover ?? {
        title: "Professional Cover Letter",
        coverLetter: outputs.coverLetter.preview,
        matchingKeywords: [],
        toneSuggestions: [],
      };
    // ── DIAGNOSTIC (no behavior change) ─────────────────────────────────────
    console.log(
      "[CareerAI] 7. saving to workflow_runs → source:", resolvedSource,
      "| coverTitle:", coverRecord.title,
      "| coverLen:", coverRecord.coverLetter.length,
      "| resumeName:", usedResume ? resumeFileName ?? "Pasted resume" : "Demo run"
    );
    // ────────────────────────────────────────────────────────────────────────
    void saveWorkflowRun({
      resumeName: usedResume ? resumeFileName ?? "Pasted resume" : "Demo run",
      resumePreview: usedResume ? resumeText.slice(0, 300) : "",
      analysis: analysisRecord,
      atsScore: clamp100(outputs.ats.score),
      coverLetter: coverRecord,
      jobMatch: {
        count: outputs.jobMatches.length,
        topFit: outputs.jobMatches.reduce((m, j) => Math.max(m, j.matchScore), 0),
        matches: outputs.jobMatches,
      },
      interview: { questions: outputs.interviewQuestions.length, readiness: 78 },
      source: resolvedSource,
      completedAt,
    });
  };

  // Reusable pipeline engine drives all step statuses and progress.
  const { statuses, running, total, run: runPipeline, reset: resetPipeline } =
    usePipeline(async () => {
      // Final step finished → resolve real AI (if any), reveal outputs,
      // persist, and glide to the Dashboard section.
      let outputs: WorkflowOutputs = MOCK_OUTPUTS;
      let source: ResultSource | null = null;
      let analysis: ResumeAnalysis | null = null;
      let cover: CoverLetterResult | null = null;

      const pending = aiPromiseRef.current;
      if (pending) {
        const r = await pending;
        outputs = r.outputs;
        source = r.source;
        analysis = r.analysis;
        cover = r.cover;
        setAiResults(r.outputs);
        setAiSource(r.source);
      }

      setShowResults(true);
      persistRun(outputs, source, analysis, cover);
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 450);
      });
    });

  const run = () => {
    setShowResults(false);
    setAiResults(null);
    setAiSource(null);
    // Kick off real AI in parallel with the (unchanged) timed animation,
    // whenever a resume or a job description is provided.
    const resume = resumeText.trim();
    const job = jobDescription.trim();
    // ── DIAGNOSTIC (no behavior change) ─────────────────────────────────────
    console.log("[CareerAI] 1. resume uploaded?:", !!resumeFileName || resume.length > 0, "| file:", resumeFileName ?? "(none)");
    console.log("[CareerAI] 2. resume text length:", resume.length);
    console.log(
      "[CareerAI] 3. resume text passed into AI?:",
      resume || job ? `YES → runRealAI(resumeLen=${resume.length}, jobLen=${job.length})` : "NO → runRealAI SKIPPED (resume text AND job description are both empty)"
    );
    // ────────────────────────────────────────────────────────────────────────
    aiPromiseRef.current = resume || job ? runRealAI(resume, job) : null;
    runPipeline();
  };

  const reset = () => {
    setShowResults(false);
    setAiResults(null);
    setAiSource(null);
    aiPromiseRef.current = null;
    resetPipeline();
  };

  // Resume-aware idle state: before a run, nothing has executed. Step 1
  // (Upload Resume) only reads "Completed" once a resume is pasted/uploaded;
  // everything else stays "Waiting". During and after a run the live engine
  // statuses are used unchanged.
  const hasResume = resumeText.trim().length > 0 || !!resumeFileName;
  const idle = !running && !showResults;
  const displayStatuses: WorkflowStepStatus[] = idle
    ? statuses.map((s, i) => (i === 0 ? (hasResume ? "completed" : "waiting") : s))
    : statuses;

  const completed = displayStatuses.filter((s) => s === "completed").length;
  const displayProgress = Math.round((completed / total) * 100);

  const selectedStep = useMemo(() => {
    if (!selectedId) return null;
    const idx = FLOW_STEPS.findIndex((s) => s.id === selectedId);
    if (idx < 0) return null;
    return { ...FLOW_STEPS[idx], status: displayStatuses[idx] };
  }, [selectedId, displayStatuses]);

  return (
    <section id="workflows" className="relative py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-7">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
              <span className="text-[11px] font-medium text-violet-300 tracking-wide uppercase">Live pipeline</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Career Automation <span className="gradient-text">Pipeline</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
              Eight AI steps, one flow — from a raw resume to a tracked application. Click any node
              for details, or run the pipeline to watch it execute.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 26px rgba(124,58,237,0.35)" }}
            >
              {running ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M3 2.5v8l6.5-4L3 2.5z" fill="currentColor" />
                  </svg>
                  Run pipeline
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 border transition-colors hover:text-white"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11 6.5a4.5 4.5 0 11-1.3-3.2M11 1.5V4H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Reset
            </button>
          </div>
        </div>

        {/* Optional resume input — drives real AI analysis when provided */}
        <ResumeInputPanel
          value={resumeText}
          onChange={setResumeText}
          fileName={resumeFileName}
          onFileNameChange={setResumeFileName}
          jobDescription={jobDescription}
          onJobDescriptionChange={setJobDescription}
          disabled={running}
        />

        {/* Canvas surface */}
        <div
          className="relative rounded-3xl border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(8,8,14,0.6)" }}
        >
          {/* Dotted grid backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* Ambient orbs */}
          <div
            className="absolute -top-24 left-1/4 w-[420px] h-[320px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 right-1/4 w-[420px] h-[320px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)" }}
          />

          {/* Progress bar */}
          <div className="relative flex items-center gap-3 px-5 sm:px-7 pt-5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", width: `${displayProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
              {completed}/{total} complete
            </span>
          </div>

          {/* Scrollable flow */}
          <div className="relative">
            {/* Edge fades */}
            <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(8,8,14,0.9), transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, rgba(8,8,14,0.9), transparent)" }} />

            <div className="overflow-x-auto py-8 px-5 sm:px-7 wf-scroll">
              <div className="flex items-center w-max mx-auto">
                {FLOW_STEPS.map((step, i) => {
                  const stepWithStatus = { ...step, status: displayStatuses[i] };
                  return (
                    <div key={step.id} className="flex items-center">
                      <WorkflowNode
                        step={stepWithStatus}
                        active={selectedId === step.id}
                        onSelect={() => setSelectedId(step.id)}
                      />
                      {i < FLOW_STEPS.length - 1 && (
                        <WorkflowConnector fromStatus={displayStatuses[i]} accent={step.accent} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="relative flex items-center gap-5 px-5 sm:px-7 pb-5 flex-wrap">
            {[
              { label: "Waiting", color: "#94a3b8" },
              { label: "Running", color: "#fbbf24" },
              { label: "Completed", color: "#34d399" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[11px] text-slate-500">{l.label}</span>
              </div>
            ))}
            <span className="text-[11px] text-slate-600 ml-auto">Scroll horizontally to explore →</span>
          </div>
        </div>
      </div>

      {/* Run outputs — revealed after the pipeline completes. Uses real AI
          results when a resume was provided; otherwise the demo mock. */}
      <WorkflowResults
        show={showResults}
        results={aiResults ?? undefined}
        source={aiSource ?? undefined}
      />

      {/* Dashboard sync — outputs land in the workspace, one after another.
          Auto-scroll target once the final step finishes. */}
      <div ref={dashboardRef}>
        <WorkflowDashboardSync show={showResults} />
      </div>

      {/* Detail side panel */}
      <NodeDetailPanel step={selectedStep} onClose={() => setSelectedId(null)} />

      {/* Connector flow keyframes (scoped, no globals.css change) */}
      <style>{`
        @keyframes wfFlow { to { stroke-dashoffset: -26; } }
        .wf-flow-line { animation: wfFlow 0.8s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .wf-flow-line { animation: none !important; }
        }

        .wf-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent; }
        .wf-scroll::-webkit-scrollbar { height: 8px; }
        .wf-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 8px; }
        .wf-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </section>
  );
}
