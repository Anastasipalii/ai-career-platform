import OpenAI from "openai";
import { withGuard } from "@/lib/security/guard";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";
import {
  validateResumeText,
  buildParsePrompt,
  normalizeParsedResume,
  type ResumeParseDraft,
} from "@/lib/resume/parseResumeDraft";

// ============================================================================
// /api/resume/parse — Resume EXTRACTOR (text → structured draft)
// ----------------------------------------------------------------------------
// Converts already-extracted résumé PLAIN TEXT (parsed client-side in Step 1)
// into a structured, FACTUAL draft compatible with the Resume Builder model.
// This is an EXTRACTOR, not a generator: it never invents data and never
// returns fabricated fallback content. On any AI failure it returns a clear
// error so the client can ask the user to paste/edit manually.
//
// PRIVACY: résumé text and the structured draft are NEVER logged. No Supabase
// writes. Nothing here mutates Resume Builder state — the client reviews the
// draft (Step 3) before applying it.
// ============================================================================

interface ParseBody {
  /** Plain résumé text extracted client-side (PDF/DOCX/TXT via the shared parser). */
  resumeText?: unknown;
  /** Back-compat alias. */
  text?: unknown;
}

type ErrorCode =
  | "invalid_request"
  | "empty_text"
  | "too_large"
  | "ai_unavailable"
  | "ai_error"
  | "malformed_response";

const errorJson = (code: ErrorCode, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: NextRequest): Promise<Response> {
  return withGuard(req, "EXPENSIVE_AI", async (): Promise<Response> => {
  // 1) Body
  let body: ParseBody;
  try {
    body = (await req.json()) as ParseBody;
  } catch {
    return errorJson("invalid_request", "Invalid JSON request body.", 400);
  }

  const rawText = typeof body.resumeText === "string" ? body.resumeText : body.text;

  // 2) Input validation + cost limits (never truncates)
  const validation = validateResumeText(rawText);
  if (!validation.ok) {
    return errorJson(validation.code, validation.message, validation.code === "too_large" ? 413 : 400);
  }
  const resumeText = validation.text;

  // 3) AI availability — no fabricated fallback if the model is unavailable
  if (!process.env.OPENAI_API_KEY) {
    return errorJson("ai_unavailable", "Resume parsing is temporarily unavailable. Please paste your details manually.", 503);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { system, user } = buildParsePrompt(resumeText);

  // 4) Extract (deterministic: temperature 0)
  let raw: string | null | undefined;
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
    raw = completion.choices[0]?.message?.content;
  } catch {
    // Never log résumé content; never fabricate a résumé on failure.
    return errorJson("ai_error", "Resume parsing failed. Please try again, or paste your details manually.", 503);
  }

  if (!raw) {
    return errorJson("malformed_response", "The parser returned an empty result. Please try again.", 502);
  }

  // 5) Parse + validate/normalize the model output (never trust it directly)
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return errorJson("malformed_response", "The parser returned an unreadable result. Please try again.", 502);
  }

  const draft: ResumeParseDraft = normalizeParsedResume(parsed);

  // 6) Return the reviewable draft (no persistence, no auto-apply)
  return NextResponse.json({ source: "live-ai", draft });
  });
}
