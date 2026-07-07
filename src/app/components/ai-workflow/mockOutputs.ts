// ============================================================================
// AI Workflow Studio — mock run outputs
// ----------------------------------------------------------------------------
// Static, illustrative results shown after the demo pipeline "completes".
// No backend, no AI call — everything here is local mock data used purely to
// demonstrate what an end-to-end run would produce.
// ============================================================================

export interface AtsSubScore {
  label: string;
  score: number; // 0–100
}

export interface ResumeBullet {
  before: string;
  after: string;
}

export interface JobMatch {
  title: string;
  /** Optional — omitted for AI recommendations (no fake companies). */
  company?: string;
  matchScore: number; // 0–100
  whyMatch: string;
  missingSkills: string[];
  recommendedSkills: string[];
}

export interface WorkflowOutputs {
  ats: {
    score: number; // 0–100 overall
    verdict: string;
    subScores: AtsSubScore[];
  };
  missingSkills: string[];
  resumeBullets: ResumeBullet[];
  coverLetter: {
    role: string;
    company: string;
    preview: string;
  };
  jobMatches: JobMatch[];
  interviewQuestions: string[];
}

export const MOCK_OUTPUTS: WorkflowOutputs = {
  ats: {
    score: 82,
    verdict: "Strong — likely to pass most ATS filters",
    subScores: [
      { label: "Keyword match", score: 88 },
      { label: "Formatting", score: 91 },
      { label: "Impact & metrics", score: 74 },
      { label: "Readability", score: 79 },
    ],
  },
  missingSkills: [
    "Kubernetes",
    "GraphQL",
    "CI/CD pipelines",
    "System design",
    "Terraform",
  ],
  resumeBullets: [
    {
      before: "Responsible for the team's frontend work and some features.",
      after:
        "Led frontend delivery for a 5-engineer team, shipping 12 features that lifted activation 23% quarter-over-quarter.",
    },
    {
      before: "Helped improve the performance of the web app.",
      after:
        "Cut initial load time 3.4s → 1.1s by code-splitting and image optimization, improving Lighthouse score to 98.",
    },
    {
      before: "Worked on the API and fixed bugs.",
      after:
        "Designed and shipped 9 REST endpoints and resolved 40+ production issues, reducing error rate by 62%.",
    },
  ],
  coverLetter: {
    role: "",
    company: "",
    preview:
      "Dear Hiring Manager,\n\nI'm excited to apply for this role. Over the past few years I've focused on building fast, accessible products and leading delivery for a growing team — taking initiatives from scoping through to measurable impact.\n\nI'd welcome the chance to bring that same focus and reliability to your team, and I'd love to discuss how my experience aligns with what you're looking for.\n\nSincerely,",
  },
  jobMatches: [
    {
      title: "Senior Frontend Engineer",
      matchScore: 91,
      whyMatch: "Strong overlap on React, TypeScript, and UI performance — the core of the role.",
      missingSkills: ["System design", "GraphQL"],
      recommendedSkills: ["Design systems at scale", "Web performance profiling"],
    },
    {
      title: "Full-Stack Engineer",
      matchScore: 84,
      whyMatch: "Solid frontend foundation plus API experience maps well to full-stack work.",
      missingSkills: ["Cloud deployment", "CI/CD pipelines"],
      recommendedSkills: ["Node.js services", "Docker & CI basics"],
    },
    {
      title: "Product Engineer",
      matchScore: 79,
      whyMatch: "Bias for measurable impact and shipping iteratively fits product-focused teams.",
      missingSkills: ["Experimentation / A-B testing"],
      recommendedSkills: ["Analytics instrumentation", "Feature-flagging"],
    },
  ],
  interviewQuestions: [
    "Walk me through how you'd architect a design system consumed by multiple product teams.",
    "Describe a time you improved a critical performance metric — what did you measure and change?",
    "How do you approach accessibility when a deadline is tight?",
    "Tell me about a disagreement with a designer or PM and how you resolved it.",
    "How would you debug a memory leak in a long-lived single-page app?",
  ],
};
