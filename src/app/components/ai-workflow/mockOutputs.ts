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
  /** 2–3 resume strengths this role builds on (optional). */
  matchedStrengths?: string[];
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

// Profession-agnostic scaffold. The only illustrative values are the generic
// ATS dimension labels and a neutral cover-letter placeholder — nothing here is
// tied to any field. Every content array is empty: real, resume-driven results
// fill them in, and the results UI shows a friendly empty state otherwise. This
// guarantees no hardcoded profession (e.g. frontend) ever leaks into a run.
export const MOCK_OUTPUTS: WorkflowOutputs = {
  ats: {
    score: 0,
    verdict: "Run the pipeline with your resume to see your ATS score",
    subScores: [
      { label: "Keyword match", score: 0 },
      { label: "Formatting", score: 0 },
      { label: "Impact & metrics", score: 0 },
      { label: "Readability", score: 0 },
    ],
  },
  missingSkills: [],
  resumeBullets: [],
  coverLetter: {
    role: "",
    company: "",
    preview:
      "Upload or paste your resume and run the pipeline to generate a personalized, resume-based cover letter here. This placeholder appears only when no resume has been provided yet.",
  },
  jobMatches: [],
  interviewQuestions: [],
};
