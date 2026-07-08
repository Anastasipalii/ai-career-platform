import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";
import { analyzeResumeLocally, matchJobsLocally } from "@/lib/localResumeFallback";
import type { ResumeAnalysis } from "@/lib/workflowRun";
import { LANGUAGE_RULE_RESUME } from "@/lib/promptLanguage";

// ============================================================================
// Job Matching Agent — real, resume-driven job match recommendations (JSON).
// ----------------------------------------------------------------------------
// Given the candidate's resume (and optional analysis / job description), returns
// the top 3 matching roles with a match score, why it fits, missing skills, and
// recommended next skills. It intentionally does NOT invent employer names —
// these are role-type recommendations. New route; the existing preferences-based
// /api/job-match/analyze is untouched. Any failure → flagged demo-fallback.
// ============================================================================

interface AgentBody {
  resumeText?: string;
  jobDescription?: string;
  targetRole?: string;
  // The client passes the full master analysis; only a subset is needed here.
  analysis?: Partial<ResumeAnalysis>;
}

interface JobMatch {
  title: string;
  matchScore: number;
  whyMatch: string;
  missingSkills: string[];
  recommendedSkills: string[];
}

type Source = "live-ai" | "demo-fallback";

// No hardcoded profession-specific demo. When AI is unavailable we return an
// empty set rather than leaking a field (e.g. frontend) that may not match the
// candidate. All real matches come from the resume-driven AI call below.
const DEMO_MATCHES: JobMatch[] = [];

const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
};

const json = (source: Source, matches: JobMatch[], status = 200) =>
  NextResponse.json({ source, data: { matches } }, { status });

export async function POST(req: NextRequest) {
  let body: AgentBody;
  try {
    body = (await req.json()) as AgentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const resumeText = (body.resumeText ?? "").trim();
  const jobDescription = (body.jobDescription ?? "").trim();
  const targetRole = (body.targetRole ?? "").trim();
  const skills = body.analysis?.detectedSkills ?? [];

  // Resume-based local job matches — used ONLY when the live model is
  // unavailable. Prefers the master analysis the client already passed (so the
  // detected profession drives the roles); otherwise re-derives it locally from
  // the resume text. Never returns an empty set for a real resume.
  const localMatches = (reason: string) => {
    const analysis: ResumeAnalysis =
      body.analysis && (body.analysis as ResumeAnalysis).profession
        ? (body.analysis as ResumeAnalysis)
        : analyzeResumeLocally(resumeText, jobDescription);
    const matches: JobMatch[] = matchJobsLocally(analysis).map((m) => ({
      title: m.title,
      matchScore: m.matchScore,
      whyMatch: m.whyMatch,
      missingSkills: m.missingSkills,
      recommendedSkills: m.recommendedSkills,
    }));
    console.log(
      "[CareerAI] fallback mode because OpenAI", reason,
      "| profession:", analysis.profession,
      "| matches:", matches.length
    );
    return json("demo-fallback", matches);
  };

  // Nothing to reason from → empty (no resume/role/skills at all).
  if (!resumeText && !jobDescription && !targetRole && skills.length === 0) {
    return json("demo-fallback", DEMO_MATCHES);
  }
  if (!process.env.OPENAI_API_KEY) {
    return localMatches("key missing");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You are a career job-matching assistant. From the candidate's resume, recommend the 6 to 8 " +
    "role TYPES that best fit their experience, ordered by fit. Each reason must be specific to the " +
    "candidate's actual skills and experience — no generic wording, and vary the phrasing across roles. " +
    "Do NOT invent specific employer/company names. Be honest about gaps. " +
    "Return ONLY valid JSON — no markdown, no extra text.\n\n" +
    LANGUAGE_RULE_RESUME;

  const parts: string[] = [];
  if (targetRole) parts.push(`Anchor the matches around this target role and closely related roles: ${targetRole}`);
  if (body.analysis?.experienceSummary) parts.push(`Experience: ${body.analysis.experienceSummary}`);
  if (skills.length) parts.push(`Skills: ${skills.join(", ")}`);
  if (resumeText) parts.push(`Resume:\n${resumeText.slice(0, 5000)}`);
  if (jobDescription) parts.push(`Target job description (bias matches toward this):\n${jobDescription.slice(0, 1500)}`);

  const user = `${parts.join("\n\n")}

Return JSON with EXACTLY this shape:
{
  "matches": [
    {
      "title": "<role title, no company>",
      "matchScore": <integer 0-100>,
      "whyMatch": "<a specific one-sentence reason grounded in the candidate's real skills/experience>",
      "missingSkills": ["<1-3 skills the role expects that are weak/absent>"],
      "recommendedSkills": ["<1-3 skills to learn next to strengthen this match>"]
    }
  ]
}
Return 6 to 8 matches, ordered by matchScore descending.`;

  try {
    const completion = await withRetryOn429(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      })
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return localMatches("returned empty content");

    const parsed = JSON.parse(raw) as { matches?: Partial<JobMatch>[] };
    const matches: JobMatch[] = (parsed.matches ?? [])
      .slice(0, 8)
      .map((m) => ({
        title: m.title?.trim() || "Recommended role",
        matchScore: clampScore(m.matchScore),
        whyMatch: m.whyMatch?.trim() || "Fits your overall experience profile.",
        missingSkills: m.missingSkills ?? [],
        recommendedSkills: m.recommendedSkills ?? [],
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (matches.length === 0) return localMatches("returned no matches");
    return json("live-ai", matches);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = /\b429\b|rate limit|quota|too many requests/i.test(msg);
    return localMatches(is429 ? "429 (rate limit / quota)" : `error: ${msg}`);
  }
}
