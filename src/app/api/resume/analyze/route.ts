import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";
import { analyzeResumeLocally } from "@/lib/localResumeFallback";
import { LANGUAGE_RULE_RESUME, languageRule } from "@/lib/promptLanguage";

// ============================================================================
// Resume Analysis Agent — the ONE master analysis. Detects the candidate's
// profession, specialization, seniority, skills and gaps directly from the
// uploaded resume and returns structured JSON. This is the single source of
// truth every downstream module (job matches, cover letter, interview, roadmap)
// is driven by. It is profession-agnostic: nothing here is hardcoded to any
// field. When AI is unavailable it returns a NEUTRAL (empty) analysis — never
// a profession-specific placeholder.
// ============================================================================

interface AnalyzeBody {
  resumeText: string;
  targetRole?: string;
  jobDescription?: string;
  /** Explicit output language (résumé-derived). When set, output is written in
   *  this language regardless of any job-description language. */
  language?: string;
}

interface ResumeAnalysis {
  profession: string;
  specialization: string;
  seniority: string;
  industries: string[];
  softSkills: string[];
  careerGoals: string[];
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

const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
};

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

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
  const jobDescription = (body.jobDescription ?? "").trim();

  if (!resumeText) {
    return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
  }

  // Resume-based local fallback — used ONLY when the live model is unavailable.
  // Never returns the empty NEUTRAL analysis for a real uploaded resume, so the
  // dashboard stays populated (field-appropriate) even under an OpenAI 429.
  const localFallback = (reason: string) => {
    const data = analyzeResumeLocally(resumeText, jobDescription);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[CareerAI] fallback mode because OpenAI", reason,
        "| profession:", data.profession,
        "| atsScore:", data.atsScore,
        "| missingSkills:", data.missingSkills.length
      );
    }
    return json("demo-fallback", data);
  };

  if (!process.env.OPENAI_API_KEY) {
    return localFallback("key missing");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You are an expert career analyst and ATS scoring engine. Read the resume and detect the " +
    "candidate's actual profession and field. It can be ANY profession that exists — the examples " +
    "given are NOT a fixed list of choices; they only illustrate the format. Output the candidate's " +
    "true profession in your own words even if it is niche or uncommon (e.g. marine biologist, " +
    "sommelier, air-traffic controller, electrician, translator). Do NOT force the candidate into any " +
    "example category, and never default to a field the resume does not support. Base every value " +
    "strictly on the resume's real content. Return ONLY valid JSON — no markdown, no extra text.\n\n" +
    // Explicit language when the client detected it from the résumé; otherwise
    // fall back to detecting from the résumé (never from a job description).
    (body.language ? languageRule(body.language) : LANGUAGE_RULE_RESUME);

  const user = `Analyze this resume and detect the candidate's real profession and profile.
${jobDescription ? `\nA target job description was also provided — factor it into missingSkills and recommendations:\n${jobDescription.slice(0, 1500)}\n` : ""}
Resume:
${resumeText.slice(0, 6000)}

Return JSON with EXACTLY this shape (values MUST reflect the actual resume, whatever the field):
{
  "profession": "<the candidate's core profession, detected freely from the resume — these are only format examples, not choices: 'Lawyer', 'Frontend Developer', 'Physician', 'Marketing Manager', 'UX Designer', 'Chef', 'Civil Engineer', 'Nurse', etc.>",
  "specialization": "<their specialization within that profession>",
  "seniority": "<Junior | Mid-level | Senior | Lead | Executive — based on the resume>",
  "industries": ["<industries/sectors they've worked in>"],
  "detectedSkills": ["<the candidate's real hard skills/tools/technologies for THEIR field>"],
  "softSkills": ["<2-5 soft skills evident in the resume>"],
  "detectedLanguages": ["<spoken/written languages>"],
  "experienceSummary": "<2-3 sentence professional summary of THIS candidate>",
  "strengths": ["<3-5 concrete strengths>"],
  "weaknesses": ["<2-4 honest gaps>"],
  "missingSkills": ["<3-6 skills/qualifications valuable for their next role in THEIR field>"],
  "careerGoals": ["<2-4 realistic next-step career goals for this candidate>"],
  "atsScore": <integer 0-100 overall ATS readiness>,
  "recommendations": ["<3-5 specific, actionable resume improvements for their field>"]
}`;

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
    if (!raw) return localFallback("returned empty content");

    const p = JSON.parse(raw) as Record<string, unknown>;
    // Every field defaults to NEUTRAL (empty) — never to a hardcoded profession.
    const data: ResumeAnalysis = {
      profession: str(p.profession),
      specialization: str(p.specialization),
      seniority: str(p.seniority),
      industries: arr(p.industries),
      softSkills: arr(p.softSkills),
      careerGoals: arr(p.careerGoals),
      detectedSkills: arr(p.detectedSkills),
      detectedLanguages: arr(p.detectedLanguages),
      experienceSummary: str(p.experienceSummary),
      strengths: arr(p.strengths),
      weaknesses: arr(p.weaknesses),
      missingSkills: arr(p.missingSkills),
      atsScore: clampScore(p.atsScore),
      recommendations: arr(p.recommendations),
    };
    return json("live-ai", data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = /\b429\b|rate limit|quota|too many requests/i.test(msg);
    return localFallback(is429 ? "429 (rate limit / quota)" : `error: ${msg}`);
  }
}
