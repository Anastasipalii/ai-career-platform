import OpenAI from "openai";
import { NextRequest } from "next/server";

interface GenerateBody {
  jobDescription: string;
  tone:           string;
  language:       string;
  // Optional advanced fields
  fullName?:      string;
  jobTitle?:      string;
  company?:       string;
  resumeSummary?: string;
  keySkills?:     string;
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

  const {
    jobDescription,
    tone = "Professional",
    language = "English (US)",
    fullName,
    jobTitle,
    company,
    resumeSummary,
    keySkills,
  } = body;

  if (!jobDescription?.trim()) {
    return errorJson("Job description is required.", 400);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toneGuide: Record<string, string> = {
    Professional: "Clear, polished, and business-appropriate. No clichés or filler phrases.",
    Friendly:     "Warm, approachable, and conversational while staying professional.",
    Confident:    "Bold, assertive, and results-focused. Lead with concrete impact.",
  };

  const system = `You are an expert cover letter writer. Write in ${language}.
Tone: ${toneGuide[tone] ?? toneGuide.Professional}
Output ONLY the 4-paragraph body of the cover letter — no greeting (Dear...), no closing (Sincerely...), no subject line. Just the 4 body paragraphs separated by blank lines.`;

  // Build context from whatever the user provided
  const contextParts: string[] = [];
  if (jobTitle || company) {
    contextParts.push(`Target role: ${[jobTitle, company].filter(Boolean).join(" at ")}`);
  }
  if (fullName) contextParts.push(`Applicant: ${fullName}`);
  if (resumeSummary) contextParts.push(`Background: ${resumeSummary}`);
  if (keySkills) contextParts.push(`Key skills: ${keySkills}`);

  const user = `Write a tailored cover letter body.

${contextParts.length > 0 ? contextParts.join("\n") + "\n\n" : ""}Job description:
${jobDescription.substring(0, 1500)}

Write exactly 4 compelling paragraphs:
1. Opening — express genuine interest in this specific opportunity based on the job description
2. Value — highlight 2-3 relevant achievements with concrete results (invent realistic examples if no background provided)
3. Fit — connect skills and approach to the company's specific needs from the job description
4. Closing — confident, direct call to action`;

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
    if (err instanceof Error && (err.message.includes("429") || err.message.toLowerCase().includes("quota"))) {
      return errorJson("AI generation is unavailable right now. Please check OpenAI billing or try again later.", 429);
    }
    const msg = err instanceof Error ? err.message : "AI request failed.";
    return errorJson(msg, 500);
  }
}
