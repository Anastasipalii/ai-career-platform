import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

type InterviewMode = "quick" | "hr" | "technical" | "full";

interface GenerateBody {
  jobDescription: string;
  jobTitle:       string;
  mode:           InterviewMode;
  language:       string;
}

interface AIQuestion {
  question: string;
  category: string;
  tip:      string;
}

const MODE_CONFIG: Record<InterviewMode, { count: number; focus: string }> = {
  quick:     { count: 5,  focus: "a balanced mix of opening, behavioral, and motivation questions" },
  hr:        { count: 8,  focus: "HR-style questions: cultural fit, behavioral (STAR), motivation, soft skills, teamwork, and career goals" },
  technical: { count: 10, focus: "role-specific technical questions: problem-solving, system thinking, domain knowledge, and practical scenarios for this job" },
  full:      { count: 12, focus: "a comprehensive mix: opening, behavioral, technical, situational, motivation, and a strong closing question" },
};

const VALID_MODES: InterviewMode[] = ["quick", "hr", "technical", "full"];

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { jobDescription, jobTitle, mode, language } = body;

  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  const { count, focus } = MODE_CONFIG[mode];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are an expert interview coach. Generate realistic, role-specific interview questions in ${language || "English (US)"}.
Return ONLY valid JSON — no markdown, no extra text.`;

  const user = `Generate exactly ${count} interview questions.

Role: ${jobTitle || "the role"}
Interview focus: ${focus}
${jobDescription?.trim() ? `Job Description:\n${jobDescription.substring(0, 1500)}` : "No job description provided — generate general professional interview questions."}

Return JSON with this exact structure:
{
  "questions": [
    {
      "question": "<the interview question>",
      "category": "<one of: Opening, Behavioral, Motivation, Technical, Situational, Cultural Fit, Closing>",
      "tip": "<1-2 sentence advice on how to structure the answer>"
    }
  ]
}

Make every question specific and tailored to the role. Vary the categories appropriately for ${focus}.`;

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

    const parsed = JSON.parse(raw) as { questions: AIQuestion[] };
    const questions: AIQuestion[] = (parsed.questions ?? []).slice(0, count);

    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions generated." }, { status: 500 });
    }

    return NextResponse.json({ questions });
  } catch (err) {
    // Graceful 429 handling
    if (
      err instanceof Error &&
      (err.message.includes("429") || err.message.toLowerCase().includes("quota") || err.message.toLowerCase().includes("rate limit"))
    ) {
      return NextResponse.json(
        { error: "AI generation is unavailable right now. Please check OpenAI billing or try again later." },
        { status: 429 }
      );
    }
    const msg = err instanceof Error ? err.message : "AI generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
