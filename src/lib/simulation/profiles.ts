// ============================================================================
// simulation/profiles — synthetic candidate catalog for load testing (data only)
// ----------------------------------------------------------------------------
// Static, non-PII synthetic profiles used by the (future) controlled load-test
// engine. NO execution, NO OpenAI, NO Arbeitnow, NO application submission here —
// this is just typed data. Every run built from these MUST be marked simulation
// (mode = "stress" → is_simulation = true) and must never touch real providers
// or submit any application.
// ============================================================================

import type { WorkflowStage } from "@/lib/workflow/stages";

/** A synthetic candidate used to drive one simulated run. */
export interface SimulationProfile {
  /** Stable synthetic key (e.g. "sim-frontend-en"). Not a real user id. */
  key: string;
  profession: string;
  /** BCP-ish language label used for the run's resume_language. */
  language: "English" | "German" | "French" | "Spanish";
  /** Domain terms a real run would derive — kept only for realistic telemetry. */
  domain: string;
  /** Expected number of "job matches" the simulation should report (synthetic). */
  jobsFound: number;
}

/** Broad domain + language coverage (frontend, backend, legal, hospitality,
 *  medical, accounting, UI/UX, marketing, sales, HR, AI automation). */
export const SIMULATION_PROFILES: readonly SimulationProfile[] = [
  { key: "sim-frontend-en",   profession: "Frontend Developer",     language: "English", domain: "frontend",     jobsFound: 6 },
  { key: "sim-frontend-de",   profession: "Frontend Developer",     language: "German",  domain: "frontend",     jobsFound: 4 },
  { key: "sim-backend-en",    profession: "Backend Developer",      language: "English", domain: "backend",      jobsFound: 5 },
  { key: "sim-legal-en",      profession: "Lawyer",                 language: "English", domain: "legal",        jobsFound: 2 },
  { key: "sim-restaurant-de", profession: "Restaurant Manager",     language: "German",  domain: "hospitality",  jobsFound: 3 },
  { key: "sim-medical-en",    profession: "Physician",              language: "English", domain: "medical",      jobsFound: 0 },
  { key: "sim-accounting-en", profession: "Accountant",             language: "English", domain: "accounting",   jobsFound: 4 },
  { key: "sim-uiux-en",       profession: "UX Designer",            language: "English", domain: "design",       jobsFound: 5 },
  { key: "sim-marketing-en",  profession: "Marketing Manager",      language: "English", domain: "marketing",    jobsFound: 4 },
  { key: "sim-sales-en",      profession: "Sales Representative",   language: "English", domain: "sales",        jobsFound: 3 },
  { key: "sim-hr-en",         profession: "HR Specialist",          language: "English", domain: "hr",           jobsFound: 3 },
  { key: "sim-ai-en",         profession: "AI Automation Engineer", language: "English", domain: "ai-automation", jobsFound: 5 },
];

/** The ordered stages a simulated run walks through (excluding the terminal). */
export const SIMULATION_STAGE_SEQUENCE: readonly WorkflowStage[] = [
  "queued",
  "resume_uploaded",
  "resume_analysis",
  "profile_created",
  "job_search",
  "job_filtering",
  "job_ranking",
  "ats_analysis",
  "cover_letter",
  "interview_questions",
  "persistence",
  "completed",
];

/** Pick a synthetic profile deterministically by index (round-robins the list). */
export function simulationProfileForIndex(i: number): SimulationProfile {
  return SIMULATION_PROFILES[((i % SIMULATION_PROFILES.length) + SIMULATION_PROFILES.length) % SIMULATION_PROFILES.length];
}
