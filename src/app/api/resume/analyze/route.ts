import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Resume Analysis Agent — real AI resume analysis returning structured JSON.
// Mirrors the existing /api/job-match/analyze pattern (json_object response).
// NEVER throws to the client: when OPENAI_API_KEY is missing or the model
// fails, it returns a clearly-flagged demo-fallback payload so the live demo
// keeps working.
// ============================================================================

interface AnalyzeBody {
  resumeText: string;
  targetRole?: string;
}

interface ResumeAnalysis {
  detectedSkills: string[];
  detectedLanguages: string[];
  experienceSummary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  atsScore: number;
  recommendations: string[];
}

type Source = "live-ai" | "demo-fallback";

// Illustrative result used whenever real AI is unavailable.
const DEMO_ANALYSIS: ResumeAnalysis = {
  detectedSkills: ["React", "TypeScript", "Node.js", "CSS", "REST APIs"],
  detectedLanguages: ["English", "German"],
  experienceSummary:
    "Frontend-focused engineer with ~4 years building web applications and design systems for product teams.",
  strengths: ["Strong UI engineering", "Performance optimization", "Clear written communication"],
  weaknesses: ["Limited backend depth", "Few quantified outcomes on bullets"],
  missingSkills: ["Kubernetes", "GraphQL", "CI/CD pipelines", "System design", "Terraform"],
  atsScore: 82,
  recommendations: [
    "Add measurable impact (numbers, %) to each bullet.",
    "Mirror keywords from the target job description.",
    "Tighten the summary to two high-signal lines.",
  ],
};

const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
};

const json = (source: Source, data: ResumeAnalysis, status = 200) =>
  NextResponse.json({ source, data }, { status });

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const resumeText = (body.resumeText ?? "").trim();
  const targetRole = (body.targetRole ?? "").trim() || "the candidate's target role";

  if (!resumeText) {
    return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
  }

  // Fallback #1: no key configured → demo result, clearly flagged.
  // ── DIAGNOSTIC (no behavior change) ───────────────────────────────────────
  console.log("[CareerAI route:analyze] OPENAI_API_KEY present?:", !!process.env.OPENAI_API_KEY, "| resumeText length:", resumeText.length);
  // ──────────────────────────────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.log("[CareerAI route:analyze] 4. OpenAI request executed?: NO (key missing) → returning demo-fallback");
    return json("demo-fallback", DEMO_ANALYSIS);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You are an expert resume analyst and ATS scoring engine. " +
    "Analyze the resume for the target role and return ONLY valid JSON — no markdown, no extra text.";

  const user = `Analyze this resume for: ${targetRole}

Resume:
${resumeText.slice(0, 6000)}

Return JSON with EXACTLY this shape:
{
  "detectedSkills": ["<skills found in the resume>"],
  "detectedLanguages": ["<spoken/written languages, e.g. English, German>"],
  "experienceSummary": "<2-3 sentence summary of experience>",
  "strengths": ["<3-5 concrete strengths>"],
  "weaknesses": ["<2-4 honest weaknesses or gaps>"],
  "missingSkills": ["<3-6 skills the target role expects that are absent>"],
  "atsScore": <integer 0-100 overall ATS readiness>,
  "recommendations": ["<3-5 specific, actionable improvements>"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return json("demo-fallback", DEMO_ANALYSIS);
    console.log("[CareerAI route:analyze] 5. OpenAI response received ✓ → live-ai");

    const parsed = JSON.parse(raw) as Partial<ResumeAnalysis>;
    const data: ResumeAnalysis = {
      detectedSkills: parsed.detectedSkills ?? DEMO_ANALYSIS.detectedSkills,
      detectedLanguages: parsed.detectedLanguages ?? DEMO_ANALYSIS.detectedLanguages,
      experienceSummary: parsed.experienceSummary ?? DEMO_ANALYSIS.experienceSummary,
      strengths: parsed.strengths ?? DEMO_ANALYSIS.strengths,
      weaknesses: parsed.weaknesses ?? DEMO_ANALYSIS.weaknesses,
      missingSkills: parsed.missingSkills ?? DEMO_ANALYSIS.missingSkills,
      atsScore: clampScore(parsed.atsScore),
      recommendations: parsed.recommendations ?? DEMO_ANALYSIS.recommendations,
    };
    return json("live-ai", data);
  } catch {
    // Fallback #2: any model/parse error → demo result, never crash.
    return json("demo-fallback", DEMO_ANALYSIS);
  }
}
