import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

interface OptimizeBody {
  fullName: string;
  currentRole: string;
  headline: string;
  about: string;
  experience: string;
  skills: string;
  careerGoals: string;
  tone: string;
  goals: string[];
  language: string;
}

interface OptimizeResult {
  headline: string;
  about: string;
  skills: string[];
  error?: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  let body: OptimizeBody;
  try {
    body = (await req.json()) as OptimizeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { fullName, currentRole, headline, about, experience, skills, careerGoals, tone, goals, language } = body;

  if (!currentRole?.trim()) {
    return NextResponse.json({ error: "Current role is required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toneMap: Record<string, string> = {
    Professional: "Clear, polished, credible. No buzzwords.",
    Confident:    "Bold, data-driven, results-first.",
    Friendly:     "Warm, approachable, human.",
    Executive:    "Strategic, senior, thought-leadership focus.",
    Creative:     "Distinctive voice, storytelling approach.",
    Minimal:      "Concise, factual, no fluff.",
    Corporate:    "Structured, formal, enterprise-appropriate.",
  };

  const system = `You are a LinkedIn profile optimisation expert. Write in ${language || "English (US)"}. Tone: ${toneMap[tone] || toneMap.Professional}
Return ONLY valid JSON — no markdown, no extra text.`;

  const user = `Optimise this LinkedIn profile for ${goals?.join(", ") || "job search"}.

Name: ${fullName || "the professional"}
Current role: ${currentRole}
Current headline: ${headline || "Not provided"}
About section: ${about || "Not provided"}
Experience: ${experience || "Not provided"}
Skills: ${skills || "Not provided"}
Career goals: ${careerGoals || goals?.join(", ") || "Not specified"}

Return JSON with exactly these keys:
{
  "headline": "LinkedIn headline (max 220 chars, no emojis, keyword-rich)",
  "about": "About section (4-5 sentences, no first-person overuse, impactful, 300-500 words)",
  "skills": ["skill1", "skill2", ..., "skill8"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 500 });
    }

    const result = JSON.parse(raw) as OptimizeResult;
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI optimisation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
