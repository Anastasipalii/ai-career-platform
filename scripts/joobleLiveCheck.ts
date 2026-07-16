// ============================================================================
// scripts/joobleLiveCheck.ts — LIVE per-profession job-pipeline diagnostics
// ----------------------------------------------------------------------------
// Runs the app's OWN adapters against the REAL Jooble + Arbeitnow APIs (no
// mocks) using the SAME concise Jooble query the app now sends, then reports:
//   Jooble raw / Arbeitnow raw / Merged / After gate
// for Frontend Developer, Lawyer, and Marketing Manager. (After-AI and
// After-MIN_MATCH_SCORE come from the real workflow — run `npm run dev` and read
// the "========== JOB SEARCH ==========" block, which needs OpenAI ranking.)
// Requires outbound network. Run from the repo root:
//   node --experimental-strip-types --import ./tests/register.mjs \
//        --env-file=.env.local scripts/joobleLiveCheck.ts
// ============================================================================

import { fetchJoobleJobs } from "@/lib/jobs/providers/jooble";
import { fetchArbeitnowJobs } from "@/lib/jobs/providers/arbeitnow";
import { combineProviderResults } from "@/lib/jobs/merge";
import { jobHasDomainMatch } from "@/lib/jobs/relevance";
import { buildCandidateProfile } from "@/lib/workflow/candidateProfile";

const key = process.env.JOOBLE_API_KEY ?? "";
console.log("JOOBLE_API_KEY present:", key.length > 0, "| len:", key.length);

const profileFor = (profession: string, skills: string[]) =>
  buildCandidateProfile(
    { profession, specialization: "", seniority: "Mid-level", industries: [], softSkills: [], careerGoals: [],
      detectedSkills: skills, detectedLanguages: ["English"], experienceSummary: "", strengths: [], weaknesses: [],
      missingSkills: [], atsScore: 70, recommendations: [] } as unknown as Parameters<typeof buildCandidateProfile>[0],
    "English"
  );

async function report(profession: string, skills: string[]) {
  const profile = profileFor(profession, skills);
  const providerQuery = (profile.profession || profession).trim(); // same concise query the app sends
  const terms = profile.requiredDomainTerms;

  const [jooble, arbeitnow] = await Promise.all([
    fetchJoobleJobs({ query: providerQuery, location: "", page: 1 }, 8000),
    fetchArbeitnowJobs({ page: 1 }, 8000),
  ]);
  const combined = combineProviderResults([
    { provider: "arbeitnow", result: arbeitnow },
    { provider: "jooble", result: jooble },
  ]);
  const afterGate = combined.jobs.filter((j) => jobHasDomainMatch(j, terms));
  const droppedByGate = combined.jobs.filter((j) => !jobHasDomainMatch(j, terms));

  console.log(`\n===== ${profession} =====`);
  console.log("  Jooble query:", JSON.stringify(providerQuery));
  console.log("  Jooble raw jobs   :", jooble.ok ? jooble.jobs.length : `ERR ${jooble.error.code}`);
  console.log("  Arbeitnow raw jobs:", arbeitnow.ok ? arbeitnow.jobs.length : `ERR ${arbeitnow.error.code}`);
  console.log("  Merged (deduped)  :", combined.jobs.length);
  console.log("  After gate        :", afterGate.length);
  if (afterGate.length === 0 && combined.jobs.length > 0) {
    console.log("  ⚠ gate removed everything. Sample dropped titles:",
      droppedByGate.slice(0, 8).map((j) => `${j.title} [${j.provider}]`));
  } else if (afterGate[0]) {
    console.log("  first surviving   :", `${afterGate[0].title} @ ${afterGate[0].company || "(no company)"} [${afterGate[0].provider}]`);
  }
}

async function run() {
  await report("Frontend Developer", ["React", "TypeScript", "CSS"]);
  await report("Lawyer", ["Contract law", "Litigation"]);
  await report("Marketing Manager", ["SEO", "Campaigns", "Content"]);
}

run().catch((e) => { console.log("SCRIPT ERROR:", (e as Error)?.name, String((e as Error)?.message).slice(0, 160)); process.exit(1); });
