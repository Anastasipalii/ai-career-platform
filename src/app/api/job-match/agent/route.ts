import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

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
  analysis?: {
    detectedSkills?: string[];
    experienceSummary?: string;
    missingSkills?: string[];
  };
}

interface JobMatch {
  title: string;
  matchScore: number;
  whyMatch: string;
  missingSkills: string[];
  recommendedSkills: string[];
}

type Source = "live-ai" | "demo-fallback";

const DEMO_MATCHES: JobMatch[] = [
  {
    title: "Senior Frontend Engineer",
    matchScore: 91,
    whyMatch: "Strong overlap on core UI engineering and performance work.",
    missingSkills: ["System design", "GraphQL"],
    recommendedSkills: ["Design systems at scale", "Web performance profiling"],
  },
  {
    title: "Full-Stack Engineer",
    matchScore: 84,
    whyMatch: "Frontend depth plus API experience maps well to full-stack roles.",
    missingSkills: ["Cloud deployment", "CI/CD pipelines"],
    recommendedSkills: ["Node.js services", "Docker & CI basics"],
  },
  {
    title: "Product Engineer",
    matchScore: 79,
    whyMatch: "Bias for measurable impact and iterative shipping fits product teams.",
    missingSkills: ["Experimentation / A-B testing"],
    recommendedSkills: ["Analytics instrumentation", "Feature-flagging"],
  },
];

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

  // Nothing to reason from → demo recommendations, flagged.
  if (!resumeText && !jobDescription && !targetRole && skills.length === 0) {
    return json("demo-fallback", DEMO_MATCHES);
  }
  if (!process.env.OPENAI_API_KEY) {
    return json("demo-fallback", DEMO_MATCHES);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You are a career job-matching assistant. From the candidate's resume, recommend the top 3 " +
    "role TYPES that best fit their experience. Do NOT invent specific employer/company names. " +
    "Be honest about gaps. Return ONLY valid JSON — no markdown, no extra text.";

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
      "whyMatch": "<one sentence on why this role fits the candidate>",
      "missingSkills": ["<1-3 skills the role expects that are weak/absent>"],
      "recommendedSkills": ["<1-3 skills to learn next to strengthen this match>"]
    }
  ]
}
Return exactly 3 matches, ordered by matchScore descending.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return json("demo-fallback", DEMO_MATCHES);

    const parsed = JSON.parse(raw) as { matches?: Partial<JobMatch>[] };
    const matches: JobMatch[] = (parsed.matches ?? [])
      .slice(0, 3)
      .map((m) => ({
        title: m.title?.trim() || "Recommended role",
        matchScore: clampScore(m.matchScore),
        whyMatch: m.whyMatch?.trim() || "Fits your overall experience profile.",
        missingSkills: m.missingSkills ?? [],
        recommendedSkills: m.recommendedSkills ?? [],
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (matches.length === 0) return json("demo-fallback", DEMO_MATCHES);
    return json("live-ai", matches);
  } catch {
    return json("demo-fallback", DEMO_MATCHES);
  }
}
