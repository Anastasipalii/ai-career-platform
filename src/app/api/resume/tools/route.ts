import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────
type StreamingTool = "grammar" | "rewriter" | "cover_letter";
type JsonTool      = "ats_score" | "keyword_match";
type ToolAction    = StreamingTool | JsonTool;

interface ToolRequestBody {
  tool: ToolAction;
  // Common
  resumeText?: string;
  inputText?:  string;
  context?:    string;
  // Keyword match
  jobDescription?: string;
  // Cover letter
  jobTitle?: string;
  company?:  string;
}

interface ATSResult {
  score: number;
  suggestions: string[];
}

interface KeywordResult {
  score: number;
  matching: string[];
  missing: string[];
  recommendations: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const errorJson = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function buildStreamPrompt(
  tool: StreamingTool,
  body: ToolRequestBody
): { system: string; user: string } {
  const outputRule =
    "Output ONLY the requested text — no preamble, no explanation, no markdown fences.";

  switch (tool) {
    case "grammar":
      return {
        system: `You are a professional resume editor. ${outputRule}`,
        user: `Fix all grammar errors, tense inconsistencies, passive voice, and style issues in the following resume content. Preserve all factual information.
Context: ${body.context ?? "resume"}

Content:
${body.inputText ?? body.resumeText ?? ""}`,
      };

    case "rewriter":
      return {
        system: `You are an expert resume writer specialising in impactful, ATS-optimised language. ${outputRule}`,
        user: `Rewrite the following resume content using strong action verbs, quantifiable achievements, and keyword-rich language. Keep the same core information.
Context: ${body.context ?? "resume"}

Content:
${body.inputText ?? ""}`,
      };

    case "cover_letter":
      return {
        system: `You are an expert cover letter writer. ${outputRule}`,
        user: `Write a compelling, tailored cover letter for the following application.

Target Role: ${body.jobTitle ?? "the position"}
Company: ${body.company ?? "the company"}

Applicant's Resume:
${body.resumeText ?? ""}

Format:
- Professional greeting
- Opening paragraph: why this role and company
- 2 body paragraphs: most relevant achievements and skills
- Closing paragraph: clear call to action
- Professional sign-off`,
      };
  }
}

function buildJsonPrompt(
  tool: JsonTool,
  body: ToolRequestBody
): { system: string; user: string } {
  switch (tool) {
    case "ats_score":
      return {
        system:
          "You are an ATS (Applicant Tracking System) compatibility expert. " +
          "Return ONLY valid JSON — no markdown, no extra text.",
        user: `Analyse this resume for ATS compatibility. Return a JSON object:
{
  "score": <integer 0-100, overall ATS compatibility score>,
  "suggestions": [
    "<specific, actionable improvement (max 12 words)>",
    ...4 to 7 items...
  ]
}

Rules: 80+ = strong, 60-79 = moderate, below 60 = needs work.
Be honest and specific — flag missing keywords, weak verbs, formatting issues.

Resume:
${body.resumeText ?? ""}`,
      };

    case "keyword_match":
      return {
        system:
          "You are an ATS keyword matching expert. " +
          "Return ONLY valid JSON — no markdown, no extra text.",
        user: `Compare the resume against the job description. Return a JSON object:
{
  "score": <integer 0-100, keyword match percentage>,
  "matching": ["<keyword found in both>", ...],
  "missing": ["<important keyword from JD not in resume>", ...],
  "recommendations": "<one sentence recommendation>"
}

Include 3-8 matching keywords and 3-8 missing keywords.

Job Description:
${body.jobDescription ?? ""}

Resume:
${body.resumeText ?? ""}`,
      };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson(
      "OpenAI is not configured. Add OPENAI_API_KEY to your environment variables.",
      500
    );
  }

  let body: ToolRequestBody;
  try {
    body = (await req.json()) as ToolRequestBody;
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  const { tool } = body;
  const validTools: ToolAction[] = ["ats_score", "keyword_match", "grammar", "rewriter", "cover_letter"];

  if (!validTools.includes(tool)) {
    return errorJson(`Invalid tool. Must be one of: ${validTools.join(", ")}.`, 400);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ── JSON tools ──
  if (tool === "ats_score" || tool === "keyword_match") {
    if (tool === "ats_score" && !body.resumeText?.trim()) {
      return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
    }
    if (tool === "keyword_match" && !body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }

    const { system, user } = buildJsonPrompt(tool, body);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return NextResponse.json({ error: "Empty AI response." }, { status: 500 });

      const result = JSON.parse(raw) as ATSResult | KeywordResult;
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Streaming tools ──
  const streamingTool = tool as StreamingTool;

  if (streamingTool === "rewriter" && !body.inputText?.trim()) {
    return errorJson("Input text is required.", 400);
  }
  if (streamingTool === "cover_letter" && !body.resumeText?.trim()) {
    return errorJson("Resume text is required.", 400);
  }
  if (streamingTool === "grammar" && !body.inputText?.trim()) {
    return errorJson("Input text is required.", 400);
  }

  const { system, user } = buildStreamPrompt(streamingTool, body);

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      stream: true,
      temperature: 0.7,
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
    const msg = err instanceof Error ? err.message : "AI request failed.";
    return errorJson(msg, 500);
  }
}
