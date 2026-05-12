import OpenAI from "openai";
import { NextRequest } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────
type LinkedInTool =
  | "headline"
  | "about_rewriter"
  | "keyword_optimization"
  | "ats_wording"
  | "tone_enhancement"
  | "visibility_boost"
  | "networking_bio"
  | "professional_branding";

interface ToolRequestBody {
  tool: LinkedInTool;
  role?: string;
  industry?: string;
  tone?: string;
  goals?: string;
  currentText?: string;
  language?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const errorResponse = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function buildPrompt(
  tool: LinkedInTool,
  body: ToolRequestBody
): { system: string; user: string } {
  const role     = body.role     || "professional";
  const industry = body.industry || "Technology";
  const tone     = body.tone     || "Professional";
  const goals    = body.goals    || "job search";
  const text     = body.currentText || "";
  const lang     = body.language || "English (US)";

  const noMarkdown =
    "Output ONLY the requested LinkedIn text — no preamble, no explanation, no markdown formatting.";

  switch (tool) {
    case "headline":
      return {
        system: `You are a LinkedIn headline specialist. Write in ${lang}. ${noMarkdown}`,
        user: `Write a compelling LinkedIn headline for a ${role} in ${industry}.
Tone: ${tone}
Career goals: ${goals}
${text ? `Current headline: "${text}"` : ""}

Requirements:
- Under 220 characters
- Keyword-rich and scroll-stopping
- Includes role, key skills, and a differentiator
- No emojis`,
      };

    case "about_rewriter":
      return {
        system: `You are a LinkedIn About section expert. Write in ${lang}. ${noMarkdown}`,
        user: `Rewrite this LinkedIn About section for a ${role} in ${industry}.
Tone: ${tone}
Career goals: ${goals}
${text ? `Current About section:\n"${text}"` : "No existing text provided — write a compelling About section from scratch."}

Requirements:
- 4-6 paragraphs, 300-400 words
- Opens with a hook (not "I am a...")
- Highlights key achievements with metrics
- Ends with a clear call to action
- No first-person overuse`,
      };

    case "keyword_optimization":
      return {
        system: `You are a LinkedIn search-optimisation expert. Write in ${lang}. ${noMarkdown}`,
        user: `Optimise this LinkedIn content with high-value recruiter keywords for a ${role} in ${industry}.
${text ? `Content to optimise:\n"${text}"` : `Write an optimised skills and expertise summary for a ${role} in ${industry}.`}

Requirements:
- Embed 8-12 high-priority recruiter search terms naturally
- Keep the text authentic and readable
- List the top keywords you embedded at the end (format: "Key keywords: keyword1, keyword2...")`,
      };

    case "ats_wording":
      return {
        system: `You are an ATS (Applicant Tracking System) optimisation expert. Write in ${lang}. ${noMarkdown}`,
        user: `Rewrite these LinkedIn experience descriptions to maximise ATS compatibility for a ${role} role.
${text ? `Current content:\n"${text}"` : `Write 3 strong ATS-friendly experience bullet points for a ${role} in ${industry}.`}

Requirements:
- Start every bullet with a strong action verb
- Include at least one quantifiable result per bullet
- Remove passive voice
- Use industry-standard terminology for ${industry}`,
      };

    case "tone_enhancement":
      return {
        system: `You are a LinkedIn tone and voice specialist. Write in ${lang}. ${noMarkdown}`,
        user: `Rewrite this LinkedIn content in a ${tone} tone for a ${role}.
${text ? `Content to rewrite:\n"${text}"` : `Write a LinkedIn summary for a ${role} in ${industry} in a ${tone} tone.`}

Tone guide for ${tone}:
- Professional: Clear, polished, credible — no buzzwords
- Confident: Bold, data-driven, results-first
- Friendly: Warm, approachable, conversational
- Executive: Strategic, senior, thought-leadership focused
- Creative: Distinctive voice, storytelling approach
- Minimal: Concise, factual, no fluff
- Corporate: Structured, formal, enterprise-appropriate

Keep all factual content identical. Only change the voice and tone.`,
      };

    case "visibility_boost":
      return {
        system: `You are a LinkedIn algorithm and SSI (Social Selling Index) expert. Write in ${lang}. ${noMarkdown}`,
        user: `Improve this ${role}'s LinkedIn profile for maximum visibility and search ranking.
${text ? `Current profile text:\n"${text}"` : `Write a visibility-optimised LinkedIn profile summary for a ${role} in ${industry}.`}

Provide:
1. Rewritten content with strategic phrases that boost LinkedIn's SSI
2. 3-5 specific formatting recommendations (e.g., "Add 5 skills in the Skills section")
3. Top 5 hashtags to follow for the ${industry} industry`,
      };

    case "networking_bio":
      return {
        system: `You are a networking and personal branding expert. Write in ${lang}. ${noMarkdown}`,
        user: `Generate networking content for a ${role} in ${industry}.
Career goals: ${goals}
${text ? `Background: "${text}"` : ""}

Provide:
1. A 2-sentence networking bio (for events/introductions)
2. A LinkedIn connection request message (under 300 characters)
3. A follow-up message after connecting (2-3 sentences)`,
      };

    case "professional_branding":
      return {
        system: `You are a professional branding strategist. Write in ${lang}. ${noMarkdown}`,
        user: `Create a cohesive personal brand narrative for a ${role} in ${industry}.
${text ? `Current profile summary:\n"${text}"` : ""}
Career goals: ${goals}
Preferred tone: ${tone}

Provide:
1. Brand statement (1 sentence — the core of who they are professionally)
2. Headline (keyword-rich, under 220 chars)
3. About section hook (first 2 sentences that appear before "See more")
4. 3 brand keywords to use consistently across all profile sections`,
      };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return errorResponse(
      "OpenAI is not configured. Add OPENAI_API_KEY to environment variables.",
      500
    );
  }

  let body: ToolRequestBody;
  try {
    body = (await req.json()) as ToolRequestBody;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const validTools: LinkedInTool[] = [
    "headline", "about_rewriter", "keyword_optimization", "ats_wording",
    "tone_enhancement", "visibility_boost", "networking_bio", "professional_branding",
  ];

  if (!validTools.includes(body.tool)) {
    return errorResponse(`Invalid tool. Must be one of: ${validTools.join(", ")}.`, 400);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { system, user } = buildPrompt(body.tool, body);

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      stream:      true,
      temperature: 0.75,
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
    // 429 quota exceeded — return a friendly JSON error the frontend can detect
    if (err instanceof Error && (err.message.includes("429") || err.message.toLowerCase().includes("quota"))) {
      return errorResponse(
        "AI generation is unavailable right now. Please check OpenAI billing or try again later.",
        429
      );
    }
    const msg = err instanceof Error ? err.message : "AI request failed.";
    return errorResponse(msg, 500);
  }
}
