import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { withRetryOn429 } from "@/lib/openaiRetry";
import { prepareApplicationPackage } from "@/lib/application/prepare";
import type { ApplicationDraft, ApplicationPackage } from "@/lib/application/types";

// ============================================================================
// /api/application/prepare — Application Preparation AI Agent
// ----------------------------------------------------------------------------
// Prepares and VALIDATES a dry-run application package. It NEVER submits an
// application, sends email, calls an employer API, automates a browser, or
// performs any external POST — the only outbound call it can make is to OpenAI
// to enrich the natural-language summary/adjustments. Readiness and validation
// are ALWAYS deterministic (never AI-dependent), and on any AI failure the
// route returns the full deterministic package so the flow always works.
// Sends only non-sensitive fields to the model: no résumé text, no cover-letter
// text, no secrets.
// ============================================================================

export async function POST(req: NextRequest) {
  let draft: ApplicationDraft | null = null;
  try {
    draft = (await req.json()) as ApplicationDraft;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Deterministic package is authoritative and complete on its own.
  const base = prepareApplicationPackage(draft);

  // No key → return the deterministic package (still fully functional).
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ package: base, source: "deterministic" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Only non-sensitive, coarse fields are shared with the model.
    const safeContext = {
      jobTitle: draft?.job?.title ?? "",
      company: draft?.job?.company ?? "",
      profession: draft?.profession ?? "",
      resumeLanguage: draft?.resumeLanguage ?? "",
      atsScore: Math.round(draft?.atsScore ?? 0),
      matchScore: Math.round(draft?.job?.matchScore ?? 0),
      readiness: base.readinessStatus,
      missingItems: base.missingItems,
    };

    const system =
      "You are an application-readiness assistant. You NEVER submit applications, send email, or contact employers — you only summarize and advise. Return ONLY valid JSON.";
    const user = `Given this application-readiness context, write a concise applicationSummary (max 2 sentences) and up to 3 short recommendedAdjustments. Do not invent facts. Context: ${JSON.stringify(
      safeContext
    )}. Return JSON: {"applicationSummary": string, "recommendedAdjustments": string[]}`;

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
    if (!raw) return NextResponse.json({ package: base, source: "deterministic" });

    const parsed = JSON.parse(raw) as { applicationSummary?: string; recommendedAdjustments?: string[] };
    const enriched: ApplicationPackage = {
      ...base,
      applicationSummary:
        typeof parsed.applicationSummary === "string" && parsed.applicationSummary.trim()
          ? parsed.applicationSummary.trim()
          : base.applicationSummary,
      recommendedAdjustments:
        Array.isArray(parsed.recommendedAdjustments) && parsed.recommendedAdjustments.length
          ? parsed.recommendedAdjustments.map((s) => String(s)).filter(Boolean).slice(0, 3)
          : base.recommendedAdjustments,
      source: "ai",
    };
    return NextResponse.json({ package: enriched, source: "ai" });
  } catch {
    // Any AI failure → deterministic fallback (the app still works).
    return NextResponse.json({ package: base, source: "deterministic" });
  }
}
