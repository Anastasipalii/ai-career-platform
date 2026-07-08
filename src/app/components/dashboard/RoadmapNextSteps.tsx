import type { WorkflowResults } from "@/lib/workflowResults";

interface RoadmapNextStepsProps {
  workflow: WorkflowResults;
}

interface Step {
  title: string;
  detail: string;
}

/** True when the run has enough data to render a Career Roadmap / Next Steps. */
export function hasRoadmap(wf: WorkflowResults | null): boolean {
  return !!wf && buildRoadmap(wf).length > 0;
}

// Derive 3–5 practical next steps from the latest workflow run's own data
// (resume analysis + job matches + interview questions). No demo data, no
// extra fetching — everything comes from the completed run.
function buildRoadmap(wf: WorkflowResults): Step[] {
  const missing = wf.missingSkills ?? [];
  const matches = wf.jobMatches ?? [];
  const detected = wf.detectedSkills ?? [];
  const recs = wf.recommendations ?? [];
  const recSkills = Array.from(new Set(matches.flatMap((m) => m.recommendedSkills ?? [])));
  const steps: Step[] = [];

  // 1) Skills to improve
  if (missing.length) {
    steps.push({
      title: "Strengthen key skills",
      detail: `Focus on ${missing.slice(0, 3).join(", ")} — these came up as gaps for your best-fit roles.`,
    });
  } else if (recSkills.length) {
    steps.push({
      title: "Level up your next skills",
      detail: `Build depth in ${recSkills.slice(0, 3).join(", ")} to strengthen your profile.`,
    });
  }

  // 2) Roles to apply for
  if (matches.length) {
    steps.push({
      title: "Apply for these roles",
      detail: `Your strongest matches: ${matches
        .slice(0, 3)
        .map((m) => `${m.title} (${m.matchScore}%)`)
        .join(", ")}.`,
    });
  }

  // 3) Portfolio / GitHub advice
  steps.push({
    title: "Showcase your work",
    detail: detected.length
      ? `Publish 2–3 projects highlighting ${detected.slice(0, 3).join(", ")} on GitHub and a portfolio, each with a clear README and measurable outcomes.`
      : "Publish 2–3 portfolio projects with clear READMEs and measurable outcomes to back up your applications.",
  });

  // 4) Interview preparation focus
  if ((wf.interviewQuestions?.length ?? 0) > 0) {
    steps.push({
      title: "Prepare for interviews",
      detail: `Practice the ${wf.interviewQuestions!.length} generated questions${
        missing.length ? `, and be ready to speak to ${missing[0]}` : ""
      }.`,
    });
  }

  // 5) Next course / certification
  const learn = recs[0] || (missing[0] ? missing[0] : recSkills[0]);
  if (learn) {
    steps.push({
      title: "Next course / certification",
      detail: recs[0]
        ? recs[0]
        : `Take a focused course or certification in ${learn} to close the biggest gap for your target roles.`,
    });
  }

  return steps.slice(0, 5);
}

export default function RoadmapNextSteps({ workflow }: RoadmapNextStepsProps) {
  const steps = buildRoadmap(workflow);
  if (steps.length === 0) return null;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Career Roadmap · Next Steps</h2>
        <span className="text-xs text-slate-500">Based on your resume</span>
      </div>

      <ol className="p-4 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-xl px-3.5 py-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold mt-0.5"
              style={{ background: "rgba(124,58,237,0.14)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.28)" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">{step.title}</p>
              <p className="text-[12px] text-slate-400 leading-snug mt-0.5">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
