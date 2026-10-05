import OpenAI from "openai";
import { withGuard } from "@/lib/security/guard";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";

// Dynamic Node runtime (prevents static route-collection quirks that surface as 405).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// /api/resume/requirements — extract STRUCTURED requirements from a job
// description, for the Resume Builder "Match to a Job" mode.
//
// This is the ONLY AI call in Job Match (one call per explicit "Analyze Match"
// click). Deterministic matching happens client-side afterwards. The prompt is
// strictly grounded: use ONLY what the job description states, never invent
// requirements, never convert preferred→required, never infer degrees/years.
// The résumé is NOT sent here — only the job description.
//
// On empty/short input → 400. On missing key / AI failure / malformed output →
// a clear error with no fabricated requirements (the client falls back to
// deterministic local extraction and says so).
// ============================================================================

const MIN_CHARS = 120;
const MAX_CHARS = 12000;

interface Body { jobDescription?: string }

export async function POST(req: NextRequest): Promise<Response> {
  return withGuard(req, "EXPENSIVE_AI", async (): Promise<Response> => {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jd = (body.jobDescription ?? "").trim();
  if (!jd) return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  if (jd.length < MIN_CHARS) {
    return NextResponse.json(
      { error: `Job description is too short — paste the full posting (at least ${MIN_CHARS} characters).` },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI requirement extraction is unavailable (OpenAI is not configured)." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system =
    "You extract structured hiring requirements from a job description. " +
    "Use ONLY information explicitly present in the text. Do NOT invent requirements. " +
    "Do NOT convert preferred/nice-to-have items into required ones. " +
    "Do NOT infer degrees, certifications, or years of experience that are not stated. " +
    "Preserve uncertainty. Return ONLY valid JSON — no markdown, no commentary.";

  const user = `From the job description below, return this exact JSON shape:
{
  "roleTitle": "<the role title if stated, else empty string>",
  "requiredSkills": ["<skills/tools explicitly stated as required or must-have>"],
  "preferredSkills": ["<skills/tools explicitly stated as preferred/nice-to-have/bonus>"],
  "importantKeywords": ["<other concrete, role-relevant keywords actually present>"]
}

Rules:
- Only include terms that literally appear (or are clearly named) in the text.
- If required vs preferred is not clearly stated, put the item in importantKeywords, not requiredSkills.
- Keep each item short (a skill or tool name, not a sentence). No duplicates.

Job description:
${jd.slice(0, MAX_CHARS)}`;

  try {
    const completion = await withRetryOn429(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      })
    );

    const rawText = completion.choices[0]?.message?.content;
    if (!rawText) {
      return NextResponse.json({ error: "AI returned an empty response. Please try again." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Malformed AI output — reject; never fabricate.
      return NextResponse.json({ error: "AI returned an unreadable response. Please try again." }, { status: 502 });
    }

    // Return the raw parsed object; the client validates/normalises with
    // validateRequirements() so the exact same guard is used everywhere.
    return NextResponse.json({ requirements: parsed });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json(
        { error: "The AI service is rate-limited right now. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (process.env.NODE_ENV !== "production") console.warn("[requirements] extraction failed:", err);
    return NextResponse.json(
      { error: "Couldn't analyze the job description right now. Please try again." },
      { status: 502 }
    );
  }
  });
}
