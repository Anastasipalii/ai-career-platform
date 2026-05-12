import OpenAI from "openai";
import { NextRequest } from "next/server";

interface GenerateBody {
  fullName: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeSummary: string;
  keySkills: string;
  tone: string;
  language: string;
}

const errorJson = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson("OpenAI is not configured. Add OPENAI_API_KEY to environment variables.", 500);
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  const { fullName, jobTitle, company, jobDescription, resumeSummary, keySkills, tone, language } = body;

  if (!jobTitle?.trim() || !company?.trim()) {
    return errorJson("Job title and company are required.", 400);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toneGuide: Record<string, string> = {
    Professional: "Clear, polished, and business-appropriate. Avoid clichés.",
    Friendly:     "Warm, approachable, and conversational while staying professional.",
    Confident:    "Bold, assertive, and results-focused. Lead with impact.",
    Formal:       "Structured, traditional, and highly formal. Use formal vocabulary.",
    Creative:     "Original, expressive, and memorable. Show personality.",
  };

  const system = `You are an expert cover letter writer. Write in ${language || "English (US)"}. ${toneGuide[tone] || toneGuide.Professional}
Output ONLY the body of the cover letter — exactly 4 paragraphs separated by blank lines. No greeting (Dear...), no salutation (Sincerely,...), no subject line. Just the 4 paragraphs.`;

  const user = `Write a cover letter body for:
Name: ${fullName || "the applicant"}
Applying for: ${jobTitle} at ${company}
Resume summary: ${resumeSummary || "Experienced professional with relevant skills"}
Key skills: ${keySkills || "Not specified"}
${jobDescription ? `Job description:\n${jobDescription.substring(0, 1000)}` : ""}

Write exactly 4 compelling paragraphs that:
1. Open with why this specific role and company excite the applicant
2. Highlight 2-3 measurable achievements from the resume that are most relevant
3. Connect their skills to the company's specific needs
4. Close with a clear call to action`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      stream: true,
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
    const msg = err instanceof Error ? err.message : "AI request failed.";
    return errorJson(msg, 500);
  }
}
