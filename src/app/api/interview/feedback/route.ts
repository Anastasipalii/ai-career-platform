import OpenAI from "openai";
import { withGuard } from "@/lib/security/guard";
import { NextRequest, NextResponse } from "next/server";
import { MODE_LABELS, INTERVIEW_LANGUAGES } from "@/app/components/interview-coach/types";

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

// Conservative caps so a single request can't drive unbounded token cost.
const MAX_QUESTION = 1000;
const MAX_ANSWER = 4000;
const MAX_FREE = 120; // jobTitle / industry

const INTERVIEW_TYPE_ALLOW = new Set<string>(Object.values(MODE_LABELS));
const LANGUAGE_ALLOW = new Set<string>(INTERVIEW_LANGUAGES as readonly string[]);
const DEFAULT_LANGUAGE = "English (US)";

const errorJson = (msg: string, status: number) =>
  NextResponse.json({ error: msg }, { status });

export async function POST(req: NextRequest): Promise<Response> {
  return withGuard(req, "EXPENSIVE_AI", async (): Promise<Response> => {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson("AI feedback is not configured right now. Please try again later.", 503);
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return errorJson("Invalid request. Please try again.", 400);
  }

  const question = (typeof body.question === "string" ? body.question : "").trim();
  const answer = (typeof body.answer === "string" ? body.answer : "").trim();
  if (!question || !answer) {
    return errorJson("Question and answer are required.", 400);
  }

  // Validate / sanitize the remaining inputs; unknown values fall back safely.
  const jobTitle = (typeof body.jobTitle === "string" ? body.jobTitle : "").trim().slice(0, MAX_FREE) || "the role";
  const industry = (typeof body.industry === "string" ? body.industry : "").trim().slice(0, MAX_FREE) || "general";
  const interviewType = INTERVIEW_TYPE_ALLOW.has(body.interviewType) ? body.interviewType : "interview";
  const language = LANGUAGE_ALLOW.has(body.language) ? body.language : DEFAULT_LANGUAGE;

  const q = question.slice(0, MAX_QUESTION);
  const a = answer.slice(0, MAX_ANSWER);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are an expert ${interviewType} coach for ${industry} roles.
Evaluate the candidate's answer and return structured feedback in ${language}.
Return ONLY valid JSON — no markdown, no extra text.

FACTUAL INTEGRITY (critical): the "improvedAnswer" must be a stronger version of the CANDIDATE'S OWN answer. You may ONLY reorganize it, improve clarity, structure, concision, and wording, and emphasize information the candidate ALREADY stated. You must NEVER invent or add employers, clients, projects, responsibilities, achievements, metrics or numbers, dates, job titles, education, certifications, skills, technologies, locations, team sizes, business results, or any other fact the candidate did not state. If the original answer lacks a concrete example or metric, keep the improved answer general and truthful — do NOT manufacture specifics. If adding a real example or metric would strengthen the answer, say so in "mistakes" as a suggestion to add one the candidate genuinely has, but never fabricate it in "improvedAnswer".`;

  const user = `Evaluate this interview answer for a ${jobTitle} role.

Question: "${q}"

Candidate's Answer: "${a}"

Return JSON with exactly these keys:
{
  "clarity":       <integer 0-100, how clear and easy to understand the answer is>,
  "confidence":    <integer 0-100, how confident and assertive the delivery sounds>,
  "structure":     <integer 0-100, how well the answer uses STAR or a similar framework>,
  "improvedAnswer": "<a stronger rewrite of the candidate's OWN answer in 3-5 sentences, inventing no new facts>",
  "keywords":      ["<3-5 relevant keywords/phrases the answer should include>"],
  "strengths":     ["<2-3 specific things the answer did well>"],
  "mistakes":      ["<2-3 specific things to avoid or improve; here you MAY suggest adding a real example/metric the candidate has>"]
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
      return errorJson("We couldn't analyse that answer. Please try again.", 502);
    }

    const result = JSON.parse(raw) as FeedbackResult;
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    const msg = e?.message ?? "";
    const is429 = e?.status === 429 || /\b429\b|rate limit|quota|too many requests/i.test(msg);
    if (is429) {
      return errorJson("AI feedback is temporarily unavailable (rate limit). Please try again shortly.", 429);
    }
    // Never surface raw internal exception text to the client.
    return errorJson("We couldn't analyse that answer. Please try again.", 500);
  }
  });
}
