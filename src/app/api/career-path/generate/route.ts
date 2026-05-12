import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

interface GenerateBody {
  currentTitle: string;
  targetTitle: string;
  industry: string;
  country: string;
  workStyle: string;
  experience: string;
  timeGoal: string;
}

interface AIPhase {
  id: number;
  title: string;
  months: string;
  color: string;
  bg: string;
  tasks: string[];
}

interface GenerateResult {
  phases: AIPhase[];
  error?: string;
}

const PHASE_COLORS = ["#ec4899", "#8b5cf6", "#06b6d4", "#10b981"];
const PHASE_BGS    = [
  "rgba(236,72,153,0.1)",
  "rgba(139,92,246,0.1)",
  "rgba(6,182,212,0.1)",
  "rgba(16,185,129,0.1)",
];

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

  const { currentTitle, targetTitle, industry, country, workStyle, experience, timeGoal } = body;

  if (!currentTitle?.trim() || !targetTitle?.trim()) {
    return NextResponse.json({ error: "Current and target titles are required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const months = parseInt(timeGoal) || 12;
  const phaseMonths = Math.round(months / 4);

  const system = `You are a career development strategist specialising in ${industry || "technology"} careers.
Create actionable, realistic career roadmaps.
Return ONLY valid JSON — no markdown, no extra text.`;

  const user = `Create a career roadmap:

From: ${currentTitle}
To: ${targetTitle}
Industry: ${industry || "Technology"}
Country: ${country || "United States"}
Work Style: ${workStyle || "Remote"}
Current Level: ${experience || "Senior"}
Timeline: ${timeGoal || "12 months"}

Divide into 4 phases of roughly ${phaseMonths} months each.

Return JSON with EXACTLY 4 phases, each with EXACTLY 3 tasks:
{
  "phases": [
    {
      "id": 1,
      "title": "<phase name, e.g. Foundation>",
      "months": "<e.g. Month 1–${phaseMonths}>",
      "tasks": [
        "<short concrete action, max 8 words>",
        "<short concrete action, max 8 words>",
        "<short concrete action, max 8 words>"
      ]
    }
  ]
}

Rules:
- Exactly 3 tasks per phase — no more, no less
- Each task is a short, concrete, checkbox-style action (e.g. "Update resume and LinkedIn profile")
- Tasks must be specific to transitioning from ${currentTitle} to ${targetTitle}
- Phase names reflect progression: Foundation → Skills → Outreach → Offers (adapt as appropriate)`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 500 });
    }

    const parsed = JSON.parse(raw) as { phases: Array<Omit<AIPhase, "color" | "bg">> };
    const phases: AIPhase[] = (parsed.phases ?? []).slice(0, 4).map((p, i) => ({
      ...p,
      id:    i + 1,
      color: PHASE_COLORS[i] ?? PHASE_COLORS[0],
      bg:    PHASE_BGS[i]    ?? PHASE_BGS[0],
      tasks: (p.tasks ?? []).slice(0, 3),   // enforce max 3 tasks
    }));

    return NextResponse.json({ phases } as GenerateResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
