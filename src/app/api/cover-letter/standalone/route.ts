import OpenAI from "openai";
import { withGuard } from "@/lib/security/guard";
import { NextRequest } from "next/server";
import { TONE_OPTIONS, LANGUAGE_OPTIONS } from "@/app/components/cover-letter/types";

// ============================================================================
// /api/cover-letter/standalone — FACTUAL cover-letter generation for the
// standalone Cover Letter tool (Cover Letter Step 2).
// ----------------------------------------------------------------------------
// This route is SEPARATE from /api/cover-letter/generate (which is referenced
// by the /ai-workflow catalog and is intentionally left untouched). It exists
// so the standalone tool can enforce a strict factual-integrity contract:
//
//   • The model may rewrite / organize / tailor / emphasize ONLY the facts the
//     user actually supplied (their résumé text + the identity fields).
//   • It must NEVER invent employers, titles, dates, education, certifications,
//     projects, skills, achievements, metrics, clients, responsibilities,
//     locations, or personal/contact details.
//   • If the background is sparse, it writes a truthful, more general letter
//     instead of fabricating specifics.
//
// Privacy: raw résumé file bytes never reach the server — the client parses the
// file in the browser (parseResumeFile) and sends only extracted text here.
// Résumé text is not logged. No Supabase writes.
// ============================================================================

interface StandaloneBody {
  jobDescription?: string;
  tone?: string;
  language?: string;
  // Real, user-reviewed candidate identity (optional; never invented server-side).
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  company?: string;
  // Extracted résumé text (client-side), the factual background for the letter.
  resumeText?: string;
}

const MAX_JOB_DESCRIPTION = 4000;
const MAX_RESUME_TEXT = 6000;

const errorJson = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Conservative allow-lists — unknown values fall back to a safe default rather
// than being injected verbatim into the prompt.
const DEFAULT_TONE = "Professional";
const DEFAULT_LANGUAGE = "English (US)";
const toneAllowed = (t: unknown): string =>
  typeof t === "string" && (TONE_OPTIONS as string[]).includes(t) ? t : DEFAULT_TONE;
const languageAllowed = (l: unknown): string =>
  typeof l === "string" && (LANGUAGE_OPTIONS as string[]).includes(l) ? l : DEFAULT_LANGUAGE;

const TONE_GUIDE: Record<string, string> = {
  Professional: "Clear, polished, and business-appropriate. No clichés or filler phrases.",
  Friendly:     "Warm, approachable, and conversational while staying professional.",
  Confident:    "Bold, assertive, and results-focused — but only about facts actually provided.",
};

export async function POST(req: NextRequest): Promise<Response> {
  return withGuard(req, "EXPENSIVE_AI", async (): Promise<Response> => {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson("AI generation is not configured right now. Please try again later.", 503);
  }

  let body: StandaloneBody;
  try {
    body = (await req.json()) as StandaloneBody;
  } catch {
    return errorJson("Invalid request. Please try again.", 400);
  }

  const jobDescription = typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
  if (!jobDescription) {
    return errorJson("Please paste a job description before generating.", 400);
  }

  const tone = toneAllowed(body.tone);
  const language = languageAllowed(body.language);
  const resumeText = (typeof body.resumeText === "string" ? body.resumeText : "").trim();

  // Only pass identity fields through when they are real strings — never guessed.
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fullName = str(body.fullName);
  const targetRole = str(body.targetRole);
  const company = str(body.company);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const hasBackground = resumeText.length > 0;

  const system =
    `You are an expert cover letter writer. Write in ${language}. ` +
    `Tone: ${TONE_GUIDE[tone] ?? TONE_GUIDE.Professional} ` +
    `GROUND the letter ONLY in the candidate's résumé/background and the fields explicitly provided. ` +
    `You may rewrite, reorganize, tailor, and emphasize those facts to fit the job. ` +
    `You must NEVER invent or assume employers, job titles, employment dates, education, ` +
    `certifications, projects, skills, achievements, metrics or numbers, clients, responsibilities, ` +
    `locations, or any personal/contact details that were not provided. ` +
    (hasBackground
      ? `Use the résumé as the single source of truth for the candidate's experience. `
      : `No résumé background was provided, so write a sincere, more general letter about interest and fit WITHOUT fabricating any specific experience, employer, or achievement. `) +
    `Never use bracketed placeholders like [Company], [Your Name], or [X years]. ` +
    `Output ONLY the body paragraphs of the letter — no "Dear …" greeting, no "Sincerely"/signature, no address or date block. Separate paragraphs with a blank line.`;

  const contextParts: string[] = [];
  if (fullName) contextParts.push(`Candidate name: ${fullName}`);
  if (targetRole) contextParts.push(`Target role: ${targetRole}`);
  if (company) contextParts.push(`Company: ${company}`);

  const user =
    `Write the body of a tailored cover letter.\n\n` +
    (contextParts.length ? contextParts.join("\n") + "\n\n" : "") +
    (hasBackground
      ? `CANDIDATE RÉSUMÉ / BACKGROUND (the only source of facts about the candidate):\n${resumeText.slice(0, MAX_RESUME_TEXT)}\n\n`
      : `No résumé background was provided.\n\n`) +
    `JOB DESCRIPTION (tailor to this, mirroring its priorities honestly):\n${jobDescription.slice(0, MAX_JOB_DESCRIPTION)}\n\n` +
    `Write 3–4 cohesive paragraphs: an opening that expresses specific interest in this role; ` +
    `${hasBackground ? "a paragraph connecting the candidate's REAL experience and skills (from the résumé) to the job's needs; " : "a paragraph on relevant strengths and motivation without inventing specifics; "}` +
    `a paragraph on fit with the role/company based on the job description; and a confident closing. ` +
    `Do not fabricate anything that is not supported above.`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: true,
      temperature: 0.6,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(enc.encode(delta));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":      "text/plain; charset=utf-8",
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    if (err instanceof Error && (err.message.includes("429") || err.message.toLowerCase().includes("quota"))) {
      return errorJson("AI generation is busy right now. Please try again in a moment.", 429);
    }
    // Never surface raw internal exception text to the user.
    return errorJson("We couldn't generate your cover letter. Please try again.", 500);
  }
  });
}
