import OpenAI from "openai";
import { NextRequest } from "next/server";

type ImproveAction = "improve" | "rewrite" | "shorten" | "translate";

interface ImproveRequestBody {
  action: ImproveAction;
  text: string;
  context: string;
  targetLanguage?: string;
}

function buildPrompt(
  action: ImproveAction,
  text: string,
  context: string,
  targetLanguage: string
): { system: string; user: string } {
  const base =
    "You are an expert professional resume writer. Output ONLY the improved resume text — " +
    "no preamble, no explanation, no markdown formatting, no quotation marks.";

  switch (action) {
    case "improve":
      return {
        system: base,
        user: `Improve the following resume content to be more impactful and ATS-friendly.
Use strong action verbs, quantifiable achievements, and relevant keywords.
Context: ${context}

Content:
${text}`,
      };
    case "rewrite":
      return {
        system: base,
        user: `Completely rewrite the following resume content with fresh, compelling language.
Preserve the core information but make it significantly more impactful.
Context: ${context}

Content:
${text}`,
      };
    case "shorten":
      return {
        system: base,
        user: `Shorten the following resume content to be concise.
Keep only the most impactful achievements, remove filler words and redundancy.
Context: ${context}

Content:
${text}`,
      };
    case "translate":
      return {
        system:
          "You are a professional resume translator. Output ONLY the translated text — " +
          "no preamble, no explanation. Maintain professional register and resume-appropriate phrasing.",
        user: `Translate the following resume content to ${targetLanguage}.

Content:
${text}`,
      };
  }
}

const errorJson = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson(
      "OpenAI is not configured. Please add OPENAI_API_KEY to your environment variables.",
      500
    );
  }

  let body: ImproveRequestBody;
  try {
    body = (await req.json()) as ImproveRequestBody;
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  const { action, text, context, targetLanguage = "German" } = body;

  const validActions: ImproveAction[] = ["improve", "rewrite", "shorten", "translate"];
  if (!validActions.includes(action)) {
    return errorJson("Invalid action. Must be one of: improve, rewrite, shorten, translate.", 400);
  }
  if (!text?.trim()) {
    return errorJson("Text is required.", 400);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { system, user } = buildPrompt(action, text, context ?? "", targetLanguage);

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
        "Content-Type":     "text/plain; charset=utf-8",
        "Cache-Control":    "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return errorJson(message, 500);
  }
}
