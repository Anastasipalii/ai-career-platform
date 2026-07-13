"use client";

import { useMemo, useRef, useState } from "react";
import { FLOW_STEPS, type WorkflowStepStatus } from "./flowSteps";
import { usePipeline } from "./usePipeline";
import { MOCK_OUTPUTS, type WorkflowOutputs, type JobMatch } from "./mockOutputs";
import { saveWorkflowResults, clearWorkflowResults } from "@/lib/workflowResults";
import {
  saveWorkflowRun,
  type ResultSource,
  type ResumeAnalysis,
  type CoverLetterResult,
} from "@/lib/workflowRun";
import { analyzeResumeLocally } from "@/lib/localResumeFallback";
import type { NormalizedJob } from "@/lib/jobs/types";
import { jobHasDomainMatch, acceptJobMatch, MIN_MATCH_SCORE } from "@/lib/jobs/relevance";
import { detectResumeLanguage } from "@/lib/i18n/detectLanguage";
import { buildCandidateProfile } from "@/lib/workflow/candidateProfile";
import ResumeInputPanel from "./ResumeInputPanel";
import WorkflowNode from "./WorkflowNode";
import WorkflowConnector from "./WorkflowConnector";
import NodeDetailPanel from "./NodeDetailPanel";
import WorkflowResults from "./WorkflowResults";
import WorkflowDashboardSync from "./WorkflowDashboardSync";

const clamp100 = (n: number) => Math.min(100, Math.max(0, Math.round(n || 0)));

// Dev-only boundary log (stripped in production; no PII / secrets / resume text).
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log(...args);
};

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
  role: string,
  jobsUnavailable = false
): WorkflowOutputs {
  const score = analysis ? clamp100(analysis.atsScore) : 0;
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
    // Resume-driven only — no hardcoded/profession-specific fallbacks.
    missingSkills: analysis?.missingSkills ?? [],
    resumeBullets: [],
    coverLetter: {
      role: role || "",
      company: "",
      preview: cover?.coverLetter ?? "",
    },
    jobMatches,
    interviewQuestions,
    jobsUnavailable,
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


// Builds a substantial (≈450-550 word), professional cover letter LOCALLY from
// the actual resume text. Used only when live AI is unavailable but a resume
// exists — grounded in the candidate's own content (skills detected in the
// resume, a real excerpt, strengths), never a hardcoded demo.
function buildLocalCoverLetter(
  resumeText: string,
  role: string,
  analysis: ResumeAnalysis | null
): CoverLetterResult {
  const name = guessCandidateName(resumeText);
  // Skills come from the master analysis (profession-agnostic) — never from
  // a hardcoded keyword list, so any field is represented faithfully.
  const skills = (analysis?.detectedSkills ?? []).slice(0, 8);
  const strengths = (analysis?.strengths ?? []).slice(0, 3);
  const summary = analysis?.experienceSummary?.trim();
  const targetRole = role && role.trim() ? role : "the role";
  const primary = skills.slice(0, 4).join(", ");

  // A professionally-worded skills sentence — NEVER raw resume text, headings,
  // or contact details. Only a natural summary built from detected skills.
  const skillsSentence = skills.length
    ? `My experience includes working with ${skills.join(", ")}, along with the modern practices these tools support.`
    : "My experience spans the practical, hands-on skills my background is built on.";

  const body =
    `Dear Hiring Manager,\n\n` +
    // Opening
    `I am writing to express my genuine interest in the ${targetRole} position. ` +
    `${name ? `My name is ${name}, and ` : ""}I believe my background is a strong match` +
    `${primary ? `, particularly my hands-on work with ${primary}` : ""}.\n\n` +
    // Professional background — summarized, never verbatim
    (summary
      ? `${summary} I focus on turning that experience into reliable, well-crafted work that moves projects forward.\n\n`
      : `Across my career I've focused on delivering reliable, well-crafted work and steadily taking on more ownership and impact.\n\n`) +
    // Relevant skills / technologies (professional summary)
    `${skillsSentence} I apply these day to day to ship maintainable work and to collaborate effectively with designers, engineers, and stakeholders.\n\n` +
    // Why this candidate fits the role
    `What makes me a strong fit for a ${targetRole} is the combination of that skill set with how I work: ` +
    (strengths.length ? `I'm recognized for ${strengths.join(", ").toLowerCase()}, and ` : "") +
    `I take ownership of problems end to end — scoping them clearly, shipping iteratively, and using results to confirm the impact. ` +
    `I care about clear communication, pragmatic trade-offs, and raising the quality bar of the work I touch.\n\n` +
    // Confident closing
    `I would welcome the opportunity to bring this experience to your team and contribute quickly to your goals. ` +
    `Thank you for considering my application — I would be glad to discuss in more detail how my background maps to what you're looking for.\n\n` +
    `Sincerely,${name ? `\n${name}` : ""}`;

  return {
    title: name ? `Cover Letter — ${name}, ${targetRole}` : `Cover Letter — ${targetRole}`,
    coverLetter: body,
    matchingKeywords: skills,
    toneSuggestions: ["Professional", "Confident", "Warm"],
  };
}

// Profession-specific interview questions built LOCALLY from the master
// analysis. Used only when the live interview agent is unavailable (e.g. a 429
// rate limit) so the pipeline still delivers questions tailored to the detected
// field — never generic frontend content, never empty when a profession exists.
function buildLocalInterviewQuestions(analysis: ResumeAnalysis | null, role: string): string[] {
  const profession = (analysis?.profession ?? "").trim();
  const spec = (analysis?.specialization ?? "").trim();
  const skills = analysis?.detectedSkills ?? [];
  const missing = analysis?.missingSkills ?? [];
  const soft = analysis?.softSkills ?? [];
  const field = profession || role || "your field";
  const [s1, s2, s3] = skills;
  const m1 = missing[0];
  const soft1 = soft[0];
  const title = role || profession || "this role";

  const qs = [
    `Walk me through your experience as a ${field}${spec ? ` specializing in ${spec}` : ""}.`,
    `What drew you to this profession, and where do you want to take your career next?`,
    s1
      ? `Describe a challenging situation where you applied ${s1}. What was the outcome?`
      : `Describe the most challenging project you've handled in ${field}.`,
    s2
      ? `How do you keep your ${s2} knowledge current as the field evolves?`
      : `How do you stay current with developments in ${field}?`,
    s3
      ? `Give an example of how you used ${s3} to deliver measurable impact.`
      : `Tell me about a measurable impact you've made in ${field}.`,
    `Tell me about a time you had to manage competing priorities under a tight deadline.`,
    soft1
      ? `Describe a situation that tested your ${soft1.toLowerCase()}.`
      : `Describe a time you resolved a conflict with a colleague or stakeholder.`,
    `How do you collaborate with people outside your immediate team or discipline?`,
    m1
      ? `This role may involve ${m1}. How would you get up to speed on it?`
      : `How do you approach learning a skill that is new to you?`,
    `Tell me about a professional mistake you made and what you learned from it.`,
    `Where do you see the biggest opportunities or challenges in ${field} today?`,
    `Why are you the right fit for ${title}?`,
  ];
  return qs.filter(Boolean).slice(0, 12);
}

// Runs the real AI agents from the candidate's own resume (primary context)
// and an optional job description. Always resolves (never throws) — any failure
// yields a demo-fallback result so the pipeline UI keeps working.
async function runRealAI(
  resumeText: string,
  jobDescription: string,
  runId: string
): Promise<AiRunResult> {
  const fallback: AiRunResult = {
    source: "demo-fallback",
    // Neutral, profession-agnostic empty outputs — never the frontend demo.
    outputs: mapToOutputs(null, null, [], [], ""),
    analysis: null,
    cover: null,
  };
  // Each network stage is guarded independently so a failure in a LATER stage
  // (e.g. a slow interview call hitting the timeout) can never discard an
  // already-generated cover letter or job matches.

  // 0) Resume language — determined ONCE, deterministically, from the résumé
  //    text (never from a job title/description). Pinned for every LLM prompt.
  const resumeLanguage = detectResumeLanguage(resumeText);
  devLog(`[CareerAI][${runId}] STEP 0 resume language:`, resumeLanguage);

  // 1) Resume analysis — only when an actual resume was provided. The detected
  //    language is passed explicitly so the analysis is written in it.
  let analysis: ResumeAnalysis | null = null;
  let analysisLive = false;
  if (resumeText) {
    try {
      const aJson = await postJson("/api/resume/analyze", {
        resumeText,
        jobDescription,
        language: resumeLanguage,
      });
      analysis = (aJson.data as ResumeAnalysis | undefined) ?? null;
      analysisLive = aJson.source === "live-ai";
    } catch (e) {
      devLog(`[CareerAI][${runId}] analyze request failed:`, (e as Error)?.message);
      analysis = null;
    }
    // Client-side guarantee: if the API returned no usable analysis, derive it
    // LOCALLY from THIS resume's text (never a shared/stale/empty result).
    if (!analysis || !analysis.profession) {
      analysis = analyzeResumeLocally(resumeText, jobDescription);
      analysisLive = false;
    }
  }

  // 2) Candidate Profile — the SINGLE source of truth for the rest of the run.
  //    Profession/targetRole come from the résumé here and are NEVER rebuilt
  //    from provider job titles later.
  const profile = buildCandidateProfile(analysis, resumeLanguage, resumeText);
  const profession = profile.profession;
  const targetRole = profile.targetRoles[0] ?? profession;
  devLog(
    `[CareerAI][${runId}] STEP 2 candidate profile — profession:`, JSON.stringify(profession),
    "| seniority:", profile.seniority || "(none)",
    "| targetRole:", JSON.stringify(targetRole),
    "| yearsExp:", profile.yearsOfExperience ?? "(n/a)",
    "| relevantSkills:", profile.relevantSkills.slice(0, 8),
    "| source:", analysisLive ? "live-ai" : "local"
  );

  // 3) Job matches — PRODUCTION uses REAL provider listings only. Step 3a
  //    fetches real jobs from /api/jobs/search; step 3b asks OpenAI to rank and
  //    explain those real jobs (identity always preserved from the provider).
  //    No fabricated/synthetic matches are ever produced here in production.
  let matches: JobMatch[] = [];
  let jobsUnavailable = false;
  // Profession-specific search intent: REQUIRED domain terms (what qualifies a
  // vacancy) + OPTIONAL modifiers (generic suffixes, hints only). The provider
  // query uses only the required domain terms — never a bare modifier like
  // "consultant" — so unrelated roles are not fetched in the first place.
  // Search intent comes straight from the Candidate Profile (single source of
  // truth) — never re-derived from generic résumé words or provider data.
  const requiredDomainTerms = profile.requiredDomainTerms;
  const searchQuery = requiredDomainTerms.length
    ? requiredDomainTerms.join(" ")
    : (profession || targetRole || "").trim();
  devLog(
    `[CareerAI][${runId}] STEP 3 search — query:`, JSON.stringify(searchQuery),
    "| requiredDomainTerms:", requiredDomainTerms,
    "| optionalModifiers:", profile.optionalModifiers
  );
  try {
    const sJson = await postJson("/api/jobs/search", {
      query: searchQuery,
      remote: false,
      page: 1,
      limit: 20,
    });
    const realJobs =
      sJson.ok === true && Array.isArray(sJson.jobs) ? (sJson.jobs as NormalizedJob[]) : null;
    if (!realJobs) {
      // Provider failed / returned an error → show an explicit unavailable state.
      jobsUnavailable = true;
      devLog(`[CareerAI][${runId}] jobs/search unavailable → real job data unavailable state`);
    } else {
      // STRICT relevance gate (title/tags only): discard off-domain jobs BEFORE
      // ranking, so the LLM never receives — and can never rescue — them.
      const qualified = realJobs.filter((j) => jobHasDomainMatch(j, requiredDomainTerms));
      const rejected = realJobs.filter((j) => !jobHasDomainMatch(j, requiredDomainTerms));
      devLog(
        `[CareerAI][${runId}] STEP 4 relevance — fetched:`, realJobs.length,
        "| accepted:", qualified.length,
        "| rejected:", rejected.length,
        "| rejected sample (no domain term in title/tags):",
        rejected.slice(0, 3).map((j) => j.title)
      );
      if (qualified.length > 0) {
        const jJson = await postJson("/api/job-match/agent", {
          resumeText,
          jobDescription,
          targetRole,
          analysis: analysis ?? undefined,
          jobs: qualified, // rank ONLY domain-qualified real jobs
        });
        const rankedMatches = (jJson.data as { matches?: JobMatch[] } | undefined)?.matches ?? [];
        // FINAL acceptance rule (single source of truth for BOTH WorkflowResults
        // and the Dashboard, since both read this persisted set): keep only
        // domain-qualified jobs whose match score is at least MIN_MATCH_SCORE.
        // Weak off-domain adjacencies (e.g. a marketing internship the ranker
        // scored low) are dropped; niche jobs are never hidden for scarcity, and
        // nothing is fabricated to backfill.
        const weak = rankedMatches.filter((m) => !acceptJobMatch(m));
        matches = rankedMatches.filter((m) => acceptJobMatch(m));
        devLog(
          `[CareerAI][${runId}] STEP 5 ranked:`, rankedMatches.length,
          `| accepted (score ≥ ${MIN_MATCH_SCORE}):`, matches.length,
          "| dropped weak:", weak.map((m) => `${m.title} (${m.matchScore})`),
          "| accepted titles:", matches.slice(0, 3).map((m) => `${m.title}${m.company ? ` @ ${m.company}` : ""} [${m.matchScore}]`)
        );
      } else {
        devLog(`[CareerAI][${runId}] STEP 5 ranked: 0 (no domain-qualified listings)`);
      }
      // No domain-qualified or accepted listings → matches stays [] (truthful
      // "no relevant live vacancies" state; the provider itself worked).
    }
  } catch (e) {
    jobsUnavailable = true;
    devLog(`[CareerAI][${runId}] jobs/search request failed:`, (e as Error)?.message);
  }

  // Annotate each REAL match with the candidate's own matched strengths (resume-
  // derived, not job data). This never alters provider identity fields.
  const ds = analysis?.detectedSkills ?? [];
  if (ds.length) {
    matches = matches.map((m, i) =>
      m.matchedStrengths && m.matchedStrengths.length
        ? m
        : {
            ...m,
            matchedStrengths: Array.from(
              new Set([ds[i % ds.length], ds[(i + 1) % ds.length], ds[(i + 2) % ds.length]])
            )
              .filter(Boolean)
              .slice(0, 3),
          }
    );
  }
  // STEP 5 — real job match titles (from the external provider).
  devLog(
    `[CareerAI][${runId}] STEP 5 job matches:`,
    matches.map((m) => `${m.title}${m.company ? ` @ ${m.company}` : ""}`).join(", ") ||
      (jobsUnavailable ? "(real job data unavailable)" : "(none)")
  );

  // Role for the cover letter & interview context — ALWAYS the résumé-derived
  // role from the Candidate Profile, NEVER the provider job title (which would
  // leak the provider's language and off-domain wording).
  const role = targetRole || profession || (matches[0]?.title ?? "");

  // 4) Job description — never empty; built from the résumé role + profile skills.
  const builtJobDescription = buildJobDescription(role, analysis, matches[0], jobDescription);

  // 6) Cover letter — résumé-primary, written in the résumé language (explicit).
  let apiCover: CoverLetterResult | null = null;
  let coverLive = false;
  try {
    const cJson = await postJson("/api/cover-letter/agent", {
      resumeText,
      jobDescription: builtJobDescription,
      analysis: analysis ?? undefined,
      tone: "Professional",
      language: resumeLanguage, // fixed output language — never from job data
    });
    apiCover = (cJson.data as CoverLetterResult | undefined) ?? null;
    coverLive = cJson.source === "live-ai";
  } catch {
    apiCover = null;
    coverLive = false;
  }

  const cover: CoverLetterResult | null = coverLive
    ? apiCover
    : resumeText
    ? buildLocalCoverLetter(resumeText, role, analysis)
    : apiCover;

  devLog(
    `[CareerAI][${runId}] STEP 6 cover-letter →`, coverLive ? "live-ai" : "local",
    "| language:", resumeLanguage,
    "| first 120 chars:", JSON.stringify((cover?.coverLetter ?? "").slice(0, 120))
  );

  // Nothing real was generated (no resume AND the API produced nothing).
  if (!cover) return fallback;

  // 6) Interview questions — role-specific (resilient; a failure here never
  //    discards the cover letter or matches). On a 429 / error / empty result
  //    the interview route yields no questions; we then build profession-based
  //    questions LOCALLY so this stage is never empty when a resume exists.
  let questions: string[] = [];
  let interviewLive = false;
  try {
    const qJson = await postJson("/api/interview/generate", {
      jobTitle: role,
      jobDescription: builtJobDescription,
      mode: "full",
      language: resumeLanguage, // fixed output language — never from job data
    });
    questions = ((qJson.questions as { question?: string }[] | undefined) ?? [])
      .map((q) => q.question?.trim() ?? "")
      .filter(Boolean);
    interviewLive = questions.length > 0;
  } catch (e) {
    devLog(`[CareerAI][${runId}] STEP 4 interview → request failed:`, (e as Error)?.message);
    questions = [];
  }
  if (questions.length === 0 && resumeText) {
    questions = buildLocalInterviewQuestions(analysis, role);
    devLog(
      `[CareerAI][${runId}] STEP 7 interview → LOCAL fallback (429/empty) —`,
      questions.length, "questions for", analysis?.profession || role || "unknown field"
    );
  }
  devLog(
    `[CareerAI][${runId}] STEP 7 interview →`, interviewLive ? "live-ai" : "local",
    "| language:", resumeLanguage,
    "| first 2:", JSON.stringify(questions.slice(0, 2))
  );

  // "Live" only when the cover letter (and analysis, when a resume exists) came
  // from live AI.
  const live = coverLive && (resumeText ? analysisLive : true);

  // Requirement 7 — one clear, visible line when the run fell back to the local
  // resume-based pipeline (e.g. OpenAI 429). Confirms the dashboard is NOT empty.
  if (!analysisLive && resumeText) {
    devLog(
      `[CareerAI][${runId}] fallback mode because OpenAI 429 —`,
      "profession:", analysis?.profession || "(none)",
      "| atsScore:", analysis?.atsScore ?? 0,
      "| matches:", matches.map((m) => m.title).join(", ") || "(none)",
      "| questions:", questions.length
    );
  }

  return {
    source: live ? "live-ai" : "demo-fallback",
    outputs: mapToOutputs(analysis, cover, matches, questions, role, jobsUnavailable),
    analysis,
    cover,
  };
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
  // Unique id for the current run — every persisted section is stamped with it
  // so the dashboard can prove it is reading ONE fresh run, not stale data.
  const runIdRef = useRef<string>("");

  // Persist a completed run to localStorage (always) + Supabase (best-effort).
  const persistRun = (
    outputs: WorkflowOutputs,
    source: ResultSource | null,
    analysis: ResumeAnalysis | null,
    cover: CoverLetterResult | null
  ) => {
    const runId = runIdRef.current;
    const completedAt = new Date().toISOString();
    // A run "used a resume" if text was pasted OR a file was uploaded.
    const usedResume = resumeText.trim().length > 0 || !!resumeFileName;
    const resolvedSource: ResultSource = source ?? "demo-fallback";

    // A cover letter counts as "generated" only when a real letter was produced
    // (live AI or the local resume-based build) — never the mock placeholder.
    const generatedCover = cover?.coverLetter?.trim() ? cover.coverLetter : "";
    const hasCover = generatedCover.length > 0;

    // ── TRACE (task 7): exactly what will land in the Dashboard for this run ──
    devLog(`[CareerAI][${runId}] RUN SUMMARY →`, {
      runId,
      profession: analysis?.profession || "(none detected)",
      atsScore: clamp100(outputs.ats.score),
      missingSkills: (analysis?.missingSkills ?? outputs.missingSkills).length,
      jobMatches: outputs.jobMatches.map((m) => m.title),
      interviewQuestions: outputs.interviewQuestions.length,
      coverLetterLength: generatedCover.length,
      completedAt,
      source: resolvedSource,
    });

    saveWorkflowResults({
      runId,
      resumeOptimized: true,
      atsScore: clamp100(outputs.ats.score),
      coverLetterGenerated: hasCover,
      jobMatchesCount: outputs.jobMatches.length,
      interviewSessionCreated: true,
      tasksCreated: 2,
      completedAt,
      source: resolvedSource,
      resumeName: usedResume ? resumeFileName ?? "Pasted resume" : undefined,
      resumePreview: usedResume ? resumeText.slice(0, 300) : undefined,
      coverLetterTitle: hasCover ? cover?.title : undefined,
      coverLetterText: hasCover ? generatedCover : undefined,
      jobMatches: outputs.jobMatches,
      interviewQuestions: outputs.interviewQuestions,
      detectedSkills: analysis?.detectedSkills,
      missingSkills: analysis?.missingSkills ?? outputs.missingSkills,
      strengths: analysis?.strengths,
      recommendations: analysis?.recommendations,
    });

    // Best-effort DB write — no-ops without a session, never blocks the UI.
    const analysisRecord: ResumeAnalysis =
      analysis ?? {
        profession: "",
        specialization: "",
        seniority: "",
        industries: [],
        softSkills: [],
        careerGoals: [],
        detectedSkills: [],
        detectedLanguages: [],
        experienceSummary: "",
        strengths: [],
        weaknesses: [],
        missingSkills: outputs.missingSkills,
        atsScore: clamp100(outputs.ats.score),
        recommendations: [],
      };
    // Store the real generated letter, or an empty-text record when none was
    // generated (so the Dashboard never treats a placeholder as generated).
    const coverRecord: CoverLetterResult =
      cover ?? { title: "", coverLetter: "", matchingKeywords: [], toneSuggestions: [] };
    // ── DIAGNOSTIC (no behavior change) ─────────────────────────────────────
    devLog(
      "[CareerAI] 7. saving to workflow_runs → source:", resolvedSource,
      "| coverTitle:", coverRecord.title,
      "| coverLen:", coverRecord.coverLetter.length,
      "| resumeName:", usedResume ? resumeFileName ?? "Pasted resume" : "Demo run"
    );
    // ────────────────────────────────────────────────────────────────────────
    devLog(
      `[CareerAI][${runId}] before saveWorkflowRun — job match count:`,
      outputs.jobMatches.length,
      "| firstId:", outputs.jobMatches[0]?.externalId ?? "(none)"
    );
    void saveWorkflowRun({
      // Idempotency: the run's unique id doubles as the run_key so re-saving the
      // same run never creates a duplicate workflow_runs row.
      runKey: runId || undefined,
      mode: "production",
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
      interview: {
        questions: outputs.interviewQuestions,
        count: outputs.interviewQuestions.length,
        readiness: 78,
      },
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
    // (req 1) Clear ALL previous workflow state before starting a new run so
    // nothing stale can survive into this upload's results.
    clearWorkflowResults();
    setShowResults(false);
    setAiResults(null);
    setAiSource(null);
    aiPromiseRef.current = null;

    // (req 2) A brand-new unique id for THIS upload — the run can never be
    // conflated with a previous one.
    const runId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    runIdRef.current = runId;

    // (req 3) Read the CURRENT resume text/file straight from state — replaced,
    // never appended or reused.
    const resume = resumeText.trim();
    const job = jobDescription.trim();

    // STEP 0 — filename + resumeText length + first 300 chars.
    devLog(
      `[CareerAI] STEP 0 upload — file: ${resumeFileName ?? "(pasted)"}`,
      `| resumeText length: ${resume.length}`,
      `| first 300 chars:`, JSON.stringify(resume.slice(0, 300))
    );
    // STEP 1 — the unique runId for this upload.
    devLog(`[CareerAI] STEP 1 runId: ${runId}`);

    aiPromiseRef.current = resume || job ? runRealAI(resume, job, runId) : null;
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
