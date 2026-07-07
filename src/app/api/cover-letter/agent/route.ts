import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Cover Letter Agent — real, personalized cover-letter generation (JSON).
// ----------------------------------------------------------------------------
// Uses the candidate's resume as the PRIMARY context. If a job description is
// provided the letter is tailored to it; otherwise a professional general
// letter is written from the candidate's experience. No hardcoded companies or
// names — the candidate's own name is used only when it appears in the resume.
// New route; the streaming /api/cover-letter/generate is untouched. Any failure
// yields a clearly-flagged demo-fallback letter so the demo never breaks.
// ============================================================================

interface AgentBody {
  resumeText?: string;
  jobDescription?: string;
  tone?: string;
  analysis?: {
    detectedSkills?: string[];
    experienceSummary?: string;
    strengths?: string[];
  };
}

interface CoverLetterResult {
  title: string;
  coverLetter: string;
  matchingKeywords: string[];
  toneSuggestions: string[];
}

type Source = "live-ai" | "demo-fallback";

// Generic professional letter — no company or personal name invented.
const DEMO_COVER: CoverLetterResult = {
  title: "Professional Cover Letter",
  coverLetter:
    "Dear Hiring Manager,\n\n" +
    "I am writing to express my interest in joining your team. Across my career I have focused on " +
    "delivering measurable results, collaborating closely with cross-functional partners, and raising " +
    "the quality bar of the products I work on.\n\n" +
    "In recent roles I have taken ownership of complex initiatives end to end — scoping the problem, " +
    "shipping iteratively, and using data to confirm the impact. I care about clear communication, " +
    "pragmatic trade-offs, and leaving systems better than I found them.\n\n" +
    "I would welcome the chance to bring that same focus and reliability to your organization, and to " +
    "contribute quickly to the goals of the team. Thank you for considering my application; I would be " +
    "glad to discuss how my experience aligns with what you are looking for.\n\n" +
    "Sincerely,",
  matchingKeywords: ["collaboration", "ownership", "measurable impact", "communication"],
  toneSuggestions: ["Professional", "Confident", "Warm"],
};

const json = (source: Source, data: CoverLetterResult, status = 200) =>
  NextResponse.json({ source, data }, { status });

export async function POST(req: NextRequest) {
  let body: AgentBody;
  try {
    body = (await req.json()) as AgentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const resumeText = (body.resumeText ?? "").trim();
  const jobDescription = (body.jobDescription ?? "").trim();
  const tone = (body.tone ?? "Professional").trim();

  // ── DIAGNOSTIC (no behavior change) ───────────────────────────────────────
  console.log("[CareerAI route:cover-letter] OPENAI_API_KEY present?:", !!process.env.OPENAI_API_KEY, "| resumeText length:", resumeText.length, "| jobDescription length:", jobDescription.length);
  // ──────────────────────────────────────────────────────────────────────────

  // Nothing to work from → generic demo letter, clearly flagged.
  if (!resumeText && !jobDescription) {
    console.log("[CareerAI route:cover-letter] 4. OpenAI request executed?: NO (no resume text AND no job description) → demo-fallback");
    return json("demo-fallback", DEMO_COVER);
  }

  // No key configured → demo letter, clearly flagged.
  if (!process.env.OPENAI_API_KEY) {
    console.log("[CareerAI route:cover-letter] 4. OpenAI request executed?: NO (key missing) → demo-fallback (client will build a local resume-based letter)");
    return json("demo-fallback", DEMO_COVER);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const tailored = jobDescription.length > 0;

  const system =
    `You are an expert cover letter writer. Write a natural, human, first-person cover letter in a ${tone} tone. ` +
    "Rules: use the candidate's RESUME as the primary source of truth for skills, experience, and achievements. " +
    (tailored
      ? "Tailor the letter specifically to the provided job description, mirroring its priorities and keywords honestly. "
      : "No job description was provided, so write a strong professional general-purpose cover letter based on the candidate's experience. ") +
    "Do NOT invent an employer/company name, do NOT invent metrics that aren't supported by the resume, and do NOT use bracketed placeholders like [Company] or [Your Name]. " +
    "If the candidate's name is clearly present in the resume, sign off with it; otherwise end with just 'Sincerely,' and no name. " +
    "The letter must be substantial and professional — 400 to 600 words, with a clear opening, two to three strong body paragraphs that reference specific experience from the resume, and a confident closing. Return ONLY valid JSON — no markdown, no extra text.";

  const contextParts: string[] = [];
  if (body.analysis?.experienceSummary) contextParts.push(`Experience summary: ${body.analysis.experienceSummary}`);
  if (body.analysis?.detectedSkills?.length) contextParts.push(`Key skills: ${body.analysis.detectedSkills.join(", ")}`);

  const user =
    `Write the cover letter and return JSON.\n\n` +
    (contextParts.length ? contextParts.join("\n") + "\n\n" : "") +
    `RESUME (primary context):\n${resumeText.slice(0, 6000) || "(not provided)"}\n\n` +
    (tailored ? `JOB DESCRIPTION (tailor to this):\n${jobDescription.slice(0, 2000)}\n\n` : "") +
    `Return JSON with EXACTLY this shape:\n` +
    `{\n` +
    `  "title": "<short title, e.g. 'Cover Letter — <role>' if a role is clear, else 'Professional Cover Letter'; do not include a fake company>",\n` +
    `  "coverLetter": "<the full letter, 400-600 words, greeting + 3-4 substantial paragraphs grounded in the resume + sign-off, using \\n for line breaks>",\n` +
    `  "matchingKeywords": ["<4-8 keywords reflected in the letter${tailored ? " that come from the job description" : ""}>"],\n` +
    `  "toneSuggestions": ["<2-3 alternative tones, e.g. Professional, Warm, Confident>"]\n` +
    `}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return json("demo-fallback", DEMO_COVER);
    console.log("[CareerAI route:cover-letter] 5. OpenAI response received ✓ → live-ai");

    const parsed = JSON.parse(raw) as Partial<CoverLetterResult>;
    const data: CoverLetterResult = {
      title: parsed.title?.trim() || DEMO_COVER.title,
      coverLetter: parsed.coverLetter?.trim() || DEMO_COVER.coverLetter,
      matchingKeywords: parsed.matchingKeywords ?? DEMO_COVER.matchingKeywords,
      toneSuggestions: parsed.toneSuggestions ?? DEMO_COVER.toneSuggestions,
    };
    return json("live-ai", data);
  } catch {
    return json("demo-fallback", DEMO_COVER);
  }
}
