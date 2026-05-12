import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

interface AnalyzeBody {
  jobTitle: string;
  location: string;
  workType: string;
  employmentType: string;
  salary: string;
  industry: string;
  seniority: string;
  language: string;
}

interface AIJobMatch {
  title: string;
  company: string;
  location: string;
  workType: string;
  employmentType: string;
  salaryRange: string;
  matchScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  postedDate: string;
}

interface AnalyzeResult {
  jobs: AIJobMatch[];
  error?: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { jobTitle, location, workType, employmentType, salary, industry, seniority } = body;

  if (!jobTitle?.trim()) {
    return NextResponse.json({ error: "Job title is required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are a job matching AI. Generate realistic representative job listings that match a candidate's preferences.
Return ONLY valid JSON — no markdown, no extra text.`;

  const user = `Generate 4 representative job matches for this candidate profile:

Target Role: ${jobTitle}
Location: ${location || "United States"}
Work Type: ${workType || "Remote"}
Employment: ${employmentType || "Full-time"}
Salary Range: ${salary || "Market rate"}
Industry: ${industry || "Technology"}
Seniority: ${seniority || "Senior"}

Return JSON with this structure:
{
  "jobs": [
    {
      "title": "<specific job title variant>",
      "company": "<realistic company name in the industry>",
      "location": "<city, state or Remote>",
      "workType": "${workType || "Remote"}",
      "employmentType": "${employmentType || "Full-time"}",
      "salaryRange": "<realistic salary range for the role>",
      "matchScore": <integer 72-98, realistic match percentage>,
      "requiredSkills": ["<3-4 skills the candidate likely has>"],
      "missingSkills": ["<1-2 skills the job requires but candidate may lack>"],
      "postedDate": "<e.g. '2 days ago' or '1 week ago'>"
    }
  ]
}

Make companies and titles realistic for the ${industry} industry. Vary match scores.`;

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

    const result = JSON.parse(raw) as AnalyzeResult;
    // Add sequential IDs for the client
    const jobs = (result.jobs ?? []).map((j, i) => ({ ...j, id: i + 1 }));
    return NextResponse.json({ jobs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI analysis failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
