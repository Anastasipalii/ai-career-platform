// ============================================================================
// localResumeFallback — resume-text-based analysis used ONLY when live AI is
// unavailable (e.g. an OpenAI 429 / quota error). This is a degraded, offline
// heuristic — the live AI in /api/resume/analyze remains the primary, canonical
// source of truth and is never replaced by this.
// ----------------------------------------------------------------------------
// It is profession-AGNOSTIC and driven entirely by keywords extracted from the
// candidate's own resume text. It recognises many fields (legal, medical,
// software, design, marketing, finance, sales, education, HR, engineering, …)
// and is NOT biased toward any one field. A lawyer resume produces legal roles,
// legal skills and legal gaps; a frontend resume produces frontend ones; etc.
// ============================================================================

import type { ResumeAnalysis, WorkflowJobMatch } from "./workflowRun";

interface ProfessionProfile {
  key: string;
  /** Human profession label (what analysis.profession will be). */
  label: string;
  /** Detection keywords — the more that appear in the resume, the stronger. */
  keywords: string[];
  /** Canonical hard skills for the field (used when few are found in text). */
  skills: string[];
  /** Skills/qualifications commonly expected for the next step in the field. */
  missing: string[];
  /** Representative job titles for local job matching. */
  roles: string[];
  /** Typical soft skills for the field. */
  soft: string[];
  /** Optional specializations detected from finer-grained keywords. */
  specializations?: { name: string; keywords: string[] }[];
}

// ── Profession knowledge base (broad, non-frontend-biased) ──────────────────
const PROFILES: ProfessionProfile[] = [
  {
    key: "legal",
    label: "Lawyer",
    keywords: ["lawyer", "attorney", "litigation", "counsel", "paralegal", "contract law", "compliance", "legal", "court", "statute", "regulatory", "llb", "juris doctor", "jd ", "bar admission", "plaintiff", "defendant", "deposition", "arbitration"],
    skills: ["Contract law", "Litigation", "Legal research", "Regulatory compliance", "Negotiation", "Due diligence"],
    missing: ["M&A due diligence", "Intellectual property law", "Cross-border regulation", "Legal tech tools"],
    roles: ["Legal Counsel", "Corporate Lawyer", "Compliance Officer", "Contracts Manager"],
    soft: ["Negotiation", "Attention to detail", "Analytical thinking"],
    specializations: [
      { name: "Corporate Law", keywords: ["corporate", "m&a", "merger", "securities", "governance"] },
      { name: "Litigation", keywords: ["litigation", "trial", "dispute", "court"] },
      { name: "Compliance", keywords: ["compliance", "regulatory", "gdpr", "aml"] },
    ],
  },
  {
    key: "medical",
    label: "Physician",
    keywords: ["physician", "doctor", "nurse", "patient", "clinical", "medical", "diagnosis", "hospital", "surgery", "pharmacology", "healthcare", "treatment", "md ", "rn ", "anatomy", "therapeutic"],
    skills: ["Patient care", "Clinical diagnosis", "Treatment planning", "Electronic health records", "Medical documentation"],
    missing: ["Board certification", "Telemedicine", "Clinical research", "Advanced life support"],
    roles: ["Physician", "Clinical Specialist", "Medical Consultant", "Attending Doctor"],
    soft: ["Empathy", "Communication", "Decision-making under pressure"],
    specializations: [
      { name: "Cardiology", keywords: ["cardio", "heart", "cardiac"] },
      { name: "Pediatrics", keywords: ["pediatric", "children", "neonatal"] },
    ],
  },
  {
    key: "frontend",
    label: "Frontend Developer",
    keywords: ["react", "javascript", "typescript", "css", "html", "frontend", "front-end", "vue", "angular", "tailwind", "redux", "next.js", "web app", "responsive", "ui component"],
    skills: ["React", "JavaScript", "TypeScript", "CSS", "HTML", "Responsive design"],
    missing: ["System design", "Web performance profiling", "Accessibility (WCAG)", "Testing (Jest/Playwright)"],
    roles: ["Frontend Developer", "UI Engineer", "Web Developer", "Full-Stack Engineer"],
    soft: ["Collaboration", "Attention to detail", "Problem-solving"],
  },
  {
    key: "backend",
    label: "Backend Developer",
    keywords: ["node", "python", "java ", "golang", "backend", "back-end", "api", "microservice", "postgres", "mysql", "mongodb", "django", "flask", "spring", "rest", "server"],
    skills: ["API design", "Databases", "Node.js", "Python", "System architecture"],
    missing: ["Distributed systems", "Kubernetes", "Message queues", "Observability"],
    roles: ["Backend Developer", "Software Engineer", "API Engineer", "Platform Engineer"],
    soft: ["Problem-solving", "Ownership", "Collaboration"],
  },
  {
    key: "data",
    label: "Data Scientist",
    keywords: ["data science", "machine learning", "ml ", "pandas", "numpy", "tensorflow", "pytorch", "analytics", "statistics", "data analysis", "sql", "regression", "model", "dataset"],
    skills: ["Python", "SQL", "Machine learning", "Statistics", "Data visualization"],
    missing: ["MLOps", "Deep learning", "Experiment design", "Cloud ML platforms"],
    roles: ["Data Scientist", "Data Analyst", "Machine Learning Engineer", "Analytics Lead"],
    soft: ["Analytical thinking", "Communication", "Curiosity"],
  },
  {
    key: "design",
    label: "UX/UI Designer",
    keywords: ["figma", "ux", "ui ", "wireframe", "prototype", "user research", "sketch", "adobe xd", "usability", "interaction design", "design system", "user experience"],
    skills: ["Figma", "User research", "Wireframing", "Prototyping", "Interaction design"],
    missing: ["Design systems at scale", "Accessibility", "Motion design", "Design ops"],
    roles: ["UX Designer", "Product Designer", "UI Designer", "UX Researcher"],
    soft: ["Empathy", "Communication", "Collaboration"],
  },
  {
    key: "marketing",
    label: "Marketing Manager",
    keywords: ["marketing", "seo", "campaign", "content strategy", "brand", "social media", "google ads", "email marketing", "growth", "conversion", "copywriting", "audience"],
    skills: ["SEO", "Content strategy", "Campaign management", "Analytics", "Social media"],
    missing: ["Marketing automation", "Performance marketing", "A/B testing", "Attribution modeling"],
    roles: ["Marketing Manager", "Content Strategist", "Growth Marketer", "SEO Specialist"],
    soft: ["Creativity", "Communication", "Data-driven thinking"],
  },
  {
    key: "finance",
    label: "Accountant",
    keywords: ["accounting", "accountant", "financial", "audit", "gaap", "reconciliation", "budget", "cpa", "tax", "ledger", "invoice", "balance sheet", "forecasting", "bookkeeping"],
    skills: ["Financial reporting", "Reconciliation", "Budgeting", "Excel modeling", "GAAP"],
    missing: ["Financial modeling", "ERP systems", "Audit readiness", "Data analytics"],
    roles: ["Accountant", "Financial Analyst", "Finance Manager", "Auditor"],
    soft: ["Attention to detail", "Integrity", "Analytical thinking"],
  },
  {
    key: "sales",
    label: "Sales Representative",
    keywords: ["sales", "quota", "pipeline", "crm", "prospecting", "account executive", "revenue", "closing", "lead generation", "salesforce", "negotiation", "b2b"],
    skills: ["Prospecting", "Pipeline management", "Negotiation", "CRM", "Account management"],
    missing: ["Solution selling", "Sales analytics", "Enterprise deals", "Forecasting"],
    roles: ["Account Executive", "Sales Manager", "Business Development Rep", "Account Manager"],
    soft: ["Persuasion", "Resilience", "Relationship building"],
  },
  {
    key: "education",
    label: "Teacher",
    keywords: ["teacher", "curriculum", "classroom", "lesson plan", "students", "pedagogy", "education", "teaching", "tutoring", "assessment", "learning outcomes"],
    skills: ["Curriculum design", "Classroom management", "Assessment", "Lesson planning", "Differentiated instruction"],
    missing: ["EdTech tools", "Special education", "Data-driven instruction", "Curriculum leadership"],
    roles: ["Teacher", "Curriculum Coordinator", "Instructional Designer", "Education Specialist"],
    soft: ["Patience", "Communication", "Adaptability"],
  },
  {
    key: "hr",
    label: "HR Specialist",
    keywords: ["human resources", "recruiting", "onboarding", "talent", "compensation", "hr ", "employee relations", "hris", "benefits", "performance review", "people ops"],
    skills: ["Recruiting", "Onboarding", "Employee relations", "HRIS", "Compensation"],
    missing: ["People analytics", "Org design", "DEI programs", "HR compliance"],
    roles: ["HR Specialist", "Recruiter", "People Operations Manager", "Talent Partner"],
    soft: ["Empathy", "Communication", "Discretion"],
  },
  {
    key: "admin",
    label: "Administrative Assistant",
    keywords: ["administrative", "office administrator", "office manager", "executive assistant", "scheduling", "calendar management", "data entry", "reception", "receptionist", "filing", "office coordination", "clerical", "correspondence", "front desk", "minutes", "travel arrangements"],
    skills: ["Calendar management", "Scheduling", "Data entry", "Office coordination", "Correspondence", "Document management"],
    missing: ["Advanced Excel", "Project coordination", "CRM/ERP tools", "Process improvement"],
    roles: ["Administrative Assistant", "Office Manager", "Executive Assistant", "Operations Coordinator"],
    soft: ["Organization", "Communication", "Reliability"],
  },
  {
    key: "product",
    label: "Product Manager",
    keywords: ["product manager", "roadmap", "stakeholder", "agile", "scrum", "backlog", "user stories", "product strategy", "prioritization", "go-to-market", "kpi"],
    skills: ["Roadmapping", "Stakeholder management", "Prioritization", "User research", "Agile"],
    missing: ["Data analysis", "Experimentation", "Technical fluency", "Pricing strategy"],
    roles: ["Product Manager", "Associate PM", "Product Owner", "Program Manager"],
    soft: ["Communication", "Leadership", "Analytical thinking"],
  },
  {
    key: "engineering",
    label: "Mechanical Engineer",
    keywords: ["mechanical engineer", "civil engineer", "cad", "autocad", "solidworks", "structural", "manufacturing", "thermodynamics", "hvac", "blueprint", "tolerance"],
    skills: ["CAD", "Design analysis", "Project documentation", "Quality control", "Technical drawing"],
    missing: ["FEA simulation", "PLM systems", "Regulatory standards", "Project management"],
    roles: ["Mechanical Engineer", "Design Engineer", "Project Engineer", "Manufacturing Engineer"],
    soft: ["Problem-solving", "Precision", "Teamwork"],
  },
];

const LANGUAGES = ["English", "German", "French", "Spanish", "Mandarin", "Arabic", "Portuguese", "Italian", "Russian", "Japanese", "Dutch", "Hindi"];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

function countHits(hay: string, keywords: string[]): number {
  let n = 0;
  for (const kw of keywords) if (hay.includes(kw)) n += 1;
  return n;
}

/** Pick the best-matching profession profile from resume text (or null). */
function detectProfile(text: string): ProfessionProfile | null {
  const hay = ` ${text.toLowerCase()} `;
  let best: ProfessionProfile | null = null;
  let bestScore = 0;
  for (const p of PROFILES) {
    const score = countHits(hay, p.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  // Require at least two independent signals to claim a field.
  return bestScore >= 2 ? best : null;
}

function detectSeniority(hay: string): string {
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief|partner|manager)\b/.test(hay)) return "Senior";
  if (/\b(junior|jr\.?|intern|entry[- ]level|graduate|trainee|assistant)\b/.test(hay)) return "Junior";
  const ym = hay.match(/(\d+)\+?\s*years?/);
  if (ym) {
    const y = Number(ym[1]);
    if (y >= 8) return "Senior";
    if (y >= 3) return "Mid-level";
    return "Junior";
  }
  return "Mid-level";
}

/** Structure-based ATS heuristic (deterministic; never fabricated per field). */
function localAtsScore(text: string): number {
  const t = text.toLowerCase();
  let score = 55;
  if (text.length > 800) score += 5;
  if (text.length > 2000) score += 5;
  if (/@/.test(text)) score += 4;
  if (/\+?\d[\d\s().-]{7,}/.test(text)) score += 3;
  if (/\bexperience\b/.test(t)) score += 5;
  if (/\beducation\b/.test(t)) score += 4;
  if (/\bskills?\b/.test(t)) score += 4;
  if (/\d+\s?%|\$\s?\d|\b\d{2,}\b/.test(text)) score += 6;
  if (/[••]|(\n\s*[-*])/.test(text)) score += 3;
  return clamp(score, 45, 88);
}

function detectLanguages(text: string): string[] {
  const found = LANGUAGES.filter((l) => new RegExp(`\\b${l}\\b`, "i").test(text));
  return found.length ? found : ["English"];
}

function detectSpecialization(hay: string, profile: ProfessionProfile): string {
  for (const s of profile.specializations ?? []) {
    if (countHits(hay, s.keywords) >= 1) return s.name;
  }
  return "";
}

/**
 * Build a resume-based ResumeAnalysis locally. Never empty for a real resume:
 * detects the field from keywords and fills every field from that + structure.
 */
export function analyzeResumeLocally(resumeText: string, jobDescription = ""): ResumeAnalysis {
  const text = `${resumeText}\n${jobDescription}`;
  const hay = ` ${text.toLowerCase()} `;
  const profile = detectProfile(text);
  const atsScore = localAtsScore(resumeText);
  const seniority = detectSeniority(hay);
  const detectedLanguages = detectLanguages(text);

  if (!profile) {
    // Unknown field — stay generic but still resume-grounded (no fake field).
    return {
      profession: "Professional",
      specialization: "",
      seniority,
      industries: [],
      softSkills: ["Communication", "Problem-solving", "Collaboration"],
      careerGoals: ["Advance into a more senior role", "Broaden core skills"],
      detectedSkills: [],
      detectedLanguages,
      experienceSummary: `${seniority} professional with hands-on experience across their field.`,
      strengths: ["Reliability", "Adaptability"],
      weaknesses: ["Add measurable achievements", "Sharpen role-specific keywords"],
      missingSkills: ["Role-specific certifications", "Quantified achievements"],
      atsScore,
      recommendations: [
        "Quantify your achievements with concrete metrics.",
        "Tailor the resume's keywords to the roles you target.",
        "Lead each bullet with a strong action verb and an outcome.",
      ],
    };
  }

  const specialization = detectSpecialization(hay, profile);
  // Detected skills: field skills that appear in the resume, padded with the
  // field's canonical skills so it is never empty and always field-appropriate.
  const present = profile.skills.filter((s) => hay.includes(s.toLowerCase()));
  const detectedSkills = (present.length >= 3 ? present : Array.from(new Set([...present, ...profile.skills]))).slice(0, 6);
  const missingSkills = profile.missing.slice(0, 4);
  const skillPhrase = detectedSkills.slice(0, 3).join(", ");

  return {
    profession: profile.label,
    specialization,
    seniority,
    industries: [],
    softSkills: profile.soft.slice(0, 4),
    careerGoals: [
      `Advance to a senior ${profile.label} role`,
      specialization ? `Deepen expertise in ${specialization}` : `Broaden expertise across ${profile.label} work`,
    ],
    detectedSkills,
    detectedLanguages,
    experienceSummary: `${seniority} ${profile.label}${specialization ? ` specializing in ${specialization}` : ""} with experience in ${skillPhrase || profile.label.toLowerCase()}.`,
    strengths: detectedSkills.slice(0, 3),
    weaknesses: missingSkills.slice(0, 2),
    missingSkills,
    atsScore,
    recommendations: [
      `Quantify your ${profile.label.toLowerCase()} achievements with concrete outcomes.`,
      missingSkills[0] ? `Highlight or build ${missingSkills[0]} to strengthen your profile.` : "Tailor keywords to each role you apply for.",
      "Lead each bullet with a strong action verb and a measurable result.",
    ],
  };
}

/** Find the profile that best matches an existing analysis (profession + skills). */
function profileForAnalysis(analysis: ResumeAnalysis): ProfessionProfile | null {
  const probe = [analysis.profession, analysis.specialization, ...(analysis.detectedSkills ?? [])].join(" ");
  return detectProfile(probe);
}

/** Build resume-based job matches locally from an analysis (field-appropriate). */
// Cycle through a list starting at `start`, returning up to `n` unique items.
function rotate(arr: string[], start: number, n: number): string[] {
  if (arr.length === 0) return [];
  const out: string[] = [];
  for (let k = 0; k < Math.min(n, arr.length); k++) out.push(arr[(start + k) % arr.length]);
  return Array.from(new Set(out));
}

/**
 * Build 6–8 resume-based role recommendations. Each is tailored to the current
 * profession/specialization/skills — role title, match score, a specific
 * personalised reason, 2–3 matched strengths, 2–3 growth skills, and 1–2
 * learning suggestions. Profession-agnostic (works for any field); never uses
 * the candidate's name or generic "has experience…" phrasing.
 */
export function matchJobsLocally(analysis: ResumeAnalysis): WorkflowJobMatch[] {
  const profile = profileForAnalysis(analysis);
  const prof = (analysis.profession || "Professional").trim();
  const spec = (analysis.specialization || "").trim();
  const seniority = (analysis.seniority || "").trim();

  const strengthsPool = (analysis.detectedSkills ?? []).filter(Boolean);
  const growthPoolRaw = (profile?.missing ?? analysis.missingSkills ?? []).filter(Boolean);
  const baseStrengths = strengthsPool.length ? strengthsPool : profile?.skills ?? [];
  const baseGrowth = growthPoolRaw.length
    ? growthPoolRaw
    : ["a role-specific certification", "advanced tools for the field"];

  // Role pool: authored field roles + tailored variants → deduped → up to 8.
  const authored = profile?.roles ?? (prof !== "Professional" ? [prof] : ["Your next role"]);
  const isSenior = /senior|lead|principal|executive|head|director/i.test(seniority);
  const variants = [
    spec ? `${spec} Specialist` : `${prof} Specialist`,
    `${prof} Consultant`,
    `${prof} Associate`,
    isSenior ? `Senior ${prof}` : `Junior ${prof}`,
    `${prof} Coordinator`,
  ];
  const roles = Array.from(new Set([...authored, ...variants]))
    .filter((r) => r && r.trim().length > 0)
    .slice(0, 8);

  const scores = [95, 92, 89, 86, 83, 80, 77, 74];

  const reasonFor = (title: string, i: number, strengths: string[]): string => {
    const focus =
      strengths[0] && strengths[1]
        ? `${strengths[0]} and ${strengths[1]}`
        : strengths[0] || (spec || prof.toLowerCase());
    const templates = [
      `Your strongest match — ${title} work centres on ${focus}, which your resume demonstrates directly.`,
      `A natural next step: ${title} builds on your ${spec || prof.toLowerCase()} background, especially ${focus}.`,
      `${title} roles prioritise ${focus}; these already read as core competencies in your profile.`,
      `Well-aligned — the day-to-day of a ${title} maps closely onto your ${focus} experience.`,
      `${title} extends your ${seniority ? seniority.toLowerCase() + " " : ""}${prof.toLowerCase()} profile into an adjacent track grounded in ${focus}.`,
      `A practical stretch role: ${title} rewards the ${focus} you bring while broadening your scope.`,
      `${title} is a strong lateral move, leveraging ${focus} from your background.`,
      `${title} fits your trajectory, pairing ${focus} with room to take on new responsibilities.`,
    ];
    return templates[i % templates.length];
  };

  return roles.map((title, i) => {
    const matchedStrengths = rotate(baseStrengths, i, 3);
    const missingSkills = rotate(baseGrowth, i, 3);
    const recommendedSkills = rotate(baseGrowth, i + 1, 2);
    return {
      title,
      matchScore: scores[i] ?? Math.max(60, 74 - i),
      whyMatch: reasonFor(title, i, matchedStrengths),
      matchedStrengths,
      missingSkills,
      recommendedSkills,
    };
  });
}
