import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

interface FeedbackBody {
  question: string;
  answer: string;
  jobTitle: string;
  industry: string;
  interviewType: string;
  language: string;
}

interface FeedbackResult {
  clarity: number;
  confidence: number;
  structure: number;
  improvedAnswer: string;
  keywords: string[];
  strengths: string[];
  mistakes: string[];
  error?: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { question, answer, jobTitle, industry, interviewType, language } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are an expert ${interviewType || "interview"} coach for ${industry || "technology"} roles.
Evaluate candidate answers and provide structured feedback in ${language || "English (US)"}.
Return ONLY valid JSON — no markdown, no extra text.`;

  const user = `Evaluate this interview answer for a ${jobTitle || "professional"} role.

Question: "${question}"

Candidate's Answer: "${answer}"

Return JSON with exactly these keys:
{
  "clarity":       <integer 0-100, how clear and easy to understand the answer is>,
  "confidence":    <integer 0-100, how confident and assertive the delivery sounds>,
  "structure":     <integer 0-100, how well the answer uses STAR or similar framework>,
  "improvedAnswer": "<a rewritten, stronger version of the answer in 3-5 sentences>",
  "keywords":      ["<3-5 relevant keywords/phrases the answer should include>"],
  "strengths":     ["<2-3 specific things the answer did well>"],
  "mistakes":      ["<2-3 specific things to avoid or improve>"]
}

Be honest but constructive. Score realistically based on the actual answer quality.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 500 });
    }

    const result = JSON.parse(raw) as FeedbackResult;
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI feedback failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
