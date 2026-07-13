import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";
import type { ResumeAnalysis } from "@/lib/workflowRun";
import type { NormalizedJob } from "@/lib/jobs/types";
import { LANGUAGE_RULE_RESUME } from "@/lib/promptLanguage";

// ============================================================================
// Job Matching Agent — RANKING LAYER over REAL provider jobs.
// ----------------------------------------------------------------------------
// The workflow first fetches real jobs from /api/jobs/search and passes them
// here. OpenAI only scores/explains those real jobs against the resume — it
// NEVER creates employers, titles, URLs, dates or salaries. Every identity
// field (externalId, provider, title, company, location, remote, sourceUrl,
// applyUrl, publishedAt) is taken from the real job and re-attached after
// ranking; any AI-invented id is discarded. No real jobs supplied → empty set
// (no fabrication).
//   source: "live-ai"       → jobs ranked/explained by the model
//           "provider-only" → real jobs returned unranked (model unavailable)
// ============================================================================

interface AgentBody {
  resumeText?: string;
  jobDescription?: string;
  targetRole?: string;
  analysis?: Partial<ResumeAnalysis>;
  /** Real jobs to rank — supplied by the workflow from /api/jobs/search. */
  jobs?: NormalizedJob[];
}

interface RankedMatch {
  title: string;
  company?: string;
  matchScore: number;
  whyMatch: string;
  missingSkills: string[];
  recommendedSkills: string[];
  externalId?: string;
  provider?: string;
  location?: string | null;
  remote?: boolean;
  jobTypes?: string[];
  sourceUrl?: string;
  applyUrl?: string;
  publishedAt?: string | null;
}

type Source = "live-ai" | "provider-only";

const MAX_MATCHES = 8;

const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 4) : [];

const json = (source: Source, matches: RankedMatch[], status = 200) =>
  NextResponse.json({ source, data: { matches } }, { status });

/** Build a match object from a REAL job (identity always from the provider). */
function baseMatch(job: NormalizedJob, score: number, why: string): RankedMatch {
  return {
    title: job.title,
    company: job.company,
    matchScore: score,
    whyMatch: why,
    missingSkills: [],
    recommendedSkills: [],
    externalId: job.externalId,
    provider: job.provider,
    location: job.location,
    remote: job.remote,
    jobTypes: job.jobTypes,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    publishedAt: job.publishedAt,
  };
}

export async function POST(req: NextRequest) {
  let body: AgentBody;
  try {
    body = (await req.json()) as AgentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const resumeText = (body.resumeText ?? "").trim();
  const jobs = Array.isArray(body.jobs) ? body.jobs.slice(0, 25) : [];

  // Dev-only boundary log (never in production; no PII / secrets / descriptions).
  if (process.env.NODE_ENV !== "production") {
    console.log("[job-match/agent] received jobs:", jobs.length, "| firstId:", jobs[0]?.externalId ?? "(none)");
  }

  // No real jobs to rank → empty set. NEVER fabricate listings here.
  if (jobs.length === 0) {
    return json("provider-only", []);
  }

  // Provider jobs keyed by their real id; ranking is merged back onto these.
  const byId = new Map(jobs.map((j) => [j.externalId, j]));

  // Neutral, un-ranked view of the real jobs (used when the model is
  // unavailable). These already passed the strict domain gate, so they are
  // relevant; a neutral PASS score keeps them above the acceptance threshold
  // instead of being dropped as if the model had scored them low.
  const NEUTRAL_RELEVANCE = 50;
  const providerOnly = (): RankedMatch[] =>
    jobs.slice(0, MAX_MATCHES).map((j) => baseMatch(j, NEUTRAL_RELEVANCE, "Live listing matched to your search."));

  if (!process.env.OPENAI_API_KEY) {
    return json("provider-only", providerOnly());
  }

  const skills = body.analysis?.detectedSkills ?? [];
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You are a job-matching assistant. You are given the candidate's resume and a list of REAL job " +
    "listings (each with an id). Score how well each listing fits the candidate and explain why. " +
    "STRICT RULES: only use the provided listing ids; NEVER invent jobs, companies, titles, URLs, " +
    "dates or salaries; do not modify any listing's title or company. Return ONLY valid JSON.\n\n" +
    LANGUAGE_RULE_RESUME;

  const jobLines = jobs
    .map(
      (j, i) =>
        `#${i} id=${j.externalId} | ${j.title} @ ${j.company}` +
        `${j.location ? ` | ${j.location}` : ""}${j.remote ? " | remote" : ""}` +
        `${j.tags.length ? ` | tags: ${j.tags.slice(0, 6).join(", ")}` : ""}` +
        `${j.jobTypes.length ? ` | types: ${j.jobTypes.join(", ")}` : ""}`
    )
    .join("\n");

  const context: string[] = [];
  if (body.analysis?.experienceSummary) context.push(`Candidate summary: ${body.analysis.experienceSummary}`);
  if (skills.length) context.push(`Candidate skills: ${skills.join(", ")}`);
  if (resumeText) context.push(`Resume (excerpt):\n${resumeText.slice(0, 4000)}`);

  const user = `${context.join("\n\n")}

REAL JOB LISTINGS (rank these only — do not add or invent any):
${jobLines}

Return JSON with EXACTLY this shape:
{
  "rankings": [
    {
      "id": "<one of the listing ids above>",
      "matchScore": <integer 0-100>,
      "whyMatch": "<one specific sentence tying THIS listing to the candidate's real experience>",
      "missingSkills": ["<0-3 skills this listing wants that the candidate lacks>"],
      "recommendedSkills": ["<0-3 skills to learn next for this listing>"]
    }
  ]
}
Only include ids from the list above. Order by matchScore descending.`;

  try {
    const completion = await withRetryOn429(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      })
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return json("provider-only", providerOnly());

    const parsed = JSON.parse(raw) as {
      rankings?: Array<{
        id?: unknown;
        matchScore?: unknown;
        whyMatch?: unknown;
        missingSkills?: unknown;
        recommendedSkills?: unknown;
      }>;
    };

    const seen = new Set<string>();
    const ranked: RankedMatch[] = [];
    for (const r of parsed.rankings ?? []) {
      const id = typeof r.id === "string" ? r.id : "";
      const job = byId.get(id); // discard any invented id
      if (!job || seen.has(id)) continue;
      seen.add(id);
      const m = baseMatch(job, clampScore(r.matchScore), typeof r.whyMatch === "string" && r.whyMatch.trim()
        ? r.whyMatch.trim()
        : "Relevant to your background.");
      m.missingSkills = strArr(r.missingSkills);
      m.recommendedSkills = strArr(r.recommendedSkills);
      ranked.push(m);
    }

    // Append any real jobs the model didn't rank, so nothing real is lost.
    for (const j of jobs) {
      if (ranked.length >= MAX_MATCHES) break;
      if (!seen.has(j.externalId)) ranked.push(baseMatch(j, 0, "Live listing matched to your search."));
    }

    ranked.sort((a, b) => b.matchScore - a.matchScore);
    const top = ranked.slice(0, MAX_MATCHES);
    if (process.env.NODE_ENV !== "production") {
      console.log("[job-match/agent] ranked matches:", top.length, "| firstId:", top[0]?.externalId ?? "(none)");
    }
    return json(seen.size > 0 ? "live-ai" : "provider-only", top);
  } catch {
    // Model failed → still return the REAL jobs, just unranked. No fabrication.
    return json("provider-only", providerOnly());
  }
}
