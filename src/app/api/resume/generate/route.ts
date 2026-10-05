import OpenAI from "openai";
import { withGuard } from "@/lib/security/guard";
import { NextRequest, NextResponse } from "next/server";

// Streaming server handler — always dynamic, Node runtime (prevents static
// route-collection/caching quirks that can surface as a 405 on POST).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GenerateRequestBody {
  jobTitle: string;
  yearsExperience: string;
  industry: string;
  skills: string[];
  language: string;
}

interface GenerateResult {
  summary: string;
  experienceDescription: string;
  suggestedSkills: string[];
  atsKeywords: string[];
}

export async function POST(req: NextRequest): Promise<Response> {
  return withGuard(req, "EXPENSIVE_AI", async (): Promise<Response> => {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Please add OPENAI_API_KEY to your environment variables." },
      { status: 500 }
    );
  }

  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { jobTitle, yearsExperience, industry, skills, language } = body;

  if (!jobTitle?.trim()) {
    return NextResponse.json({ error: "Job title is required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are an expert professional resume writer specialising in ATS-optimised resumes. Generate content in ${language || "English (US)"}.
Rules:
- Never use first-person pronouns (I, my, me)
- Lead every achievement bullet with a strong action verb
- Use keywords that pass ATS scanners for ${industry || "the technology"} industry
FACTUAL INTEGRITY (critical): this is a draft built ONLY from the details the user supplied (job title, industry, skills). Do NOT invent specific employers, job titles, employment dates, education, degrees, certifications, real metrics/numbers, or achievements and present them as facts. Write generic, editable phrasing the user will fill in with their real details; never fabricate credentials.
- Return ONLY the JSON object, no markdown, no extra text`;

  const userPrompt = `Generate professional resume content for:
Job Title: ${jobTitle}
Years of Experience: ${yearsExperience || "3–5 years"}
Industry: ${industry || "Technology"}
Key Skills: ${skills.length ? skills.join(", ") : "not specified"}

Return a JSON object with EXACTLY these keys:
{
  "summary": "Two to three sentence professional summary, ATS-optimised, no first-person pronouns",
  "experienceDescription": "Achievement line 1 using action verb\\nAchievement line 2\\nAchievement line 3\\nAchievement line 4",
  "suggestedSkills": ["Skill A", "Skill B", "Skill C", "Skill D", "Skill E"],
  "atsKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty response from AI." }, { status: 500 });
    }

    const result = JSON.parse(raw) as GenerateResult;
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}
