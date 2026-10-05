// ============================================================================
// jobs/location — deterministic location relevance filter (no geocoding yet)
// ----------------------------------------------------------------------------
// Pure, provider-neutral. Decides whether a REAL job survives the user's search
// location preferences, using country/region matching (a true kilometre-radius
// layer can be added later behind DistanceService without touching callers).
//
// Rules (see PART 1 / PART 1A):
//   • clearly-remote jobs may be worldwide (when the user allows it), but an
//     explicit remote restriction (Germany only / EU only / US only / work
//     authorization / timezone) is preserved and evaluated;
//   • on-site / hybrid jobs must be within the selected country/region;
//   • a job with an unknown location is rejected UNLESS it is clearly remote;
//   • never invent or guess a location; a job is "remote" only from its remote
//     flag or its title/location text — never from generic description words.
// ============================================================================

import type { NormalizedJob } from "@/lib/jobs/types";
import { resolveCountryFromText, countryName } from "@/lib/geo/countries";

export type Radius = 25 | 50 | 100 | 200;

export interface SearchLocationPrefs {
  /** User-entered Target Profession / job title — the SOURCE OF TRUTH for the
   *  job search (provider query, domain family, classification). Carried with
   *  the prefs object for convenience; the location functions below ignore it. */
  targetProfession?: string;
  /** City the user is searching from (display + future geocoding). */
  city?: string;
  /** ISO-ish country code we filter on ("DE", "US", …) or "" when unknown. */
  country?: string;
  /** Radius in km (used by a future DistanceService; region-match for now). */
  radiusKm?: Radius;
  /** Clearly-remote jobs may be searched worldwide. */
  remoteWorldwide?: boolean;
  /** Hybrid jobs limited to the radius (default true). */
  hybridWithinRadius?: boolean;
  /** On-site jobs limited to the radius (default true). */
  onsiteWithinRadius?: boolean;
}

export type WorkMode = "remote" | "onsite" | "unknown";
export type LocationDecision = { keep: boolean; mode: WorkMode; reason: string };

// ── country resolution (deterministic, no external service) ───────────────────
const US_STATES = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md",
  "ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc",
  "sd","tn","tx","ut","vt","va","wa","wv","wi","wy",
]);
// A small set of common German cities so "Cologne"/"Köln" resolves to DE even
// without an explicit country token. Never used to INVENT a location.
const DE_CITIES = [
  "düsseldorf","dusseldorf","duesseldorf","köln","koln","cologne","berlin","münchen","munchen","munich",
  "hamburg","frankfurt","stuttgart","dortmund","essen","bremen","hannover","hanover","leipzig","dresden",
  "nürnberg","nurnberg","nuremberg","bonn","mannheim","karlsruhe","wiesbaden","münster","munster","aachen",
];
const EU_COUNTRIES = new Set(["DE", "FR", "NL", "BE", "AT", "ES", "IT", "PL", "IE", "PT", "SE", "DK", "FI"]);

/** Resolve a country code from a free-text location, or "" when unknown. Uses
 *  the full ISO country list plus sub-national heuristics (US state abbrevs,
 *  common German cities). Never guesses a city. */
export function resolveCountry(raw: string | null | undefined): string {
  const t = (raw ?? "").toLowerCase();
  if (!t.trim()) return "";
  // Full country-name / alias match (Germany, United States, Spain, …).
  const byName = resolveCountryFromText(t);
  if (byName) return byName;
  // US state abbreviation after a comma, e.g. "New Bremen, OH".
  const st = t.match(/,\s*([a-z]{2})\b/);
  if (st && US_STATES.has(st[1])) return "US";
  // Common German cities (so "Köln"/"Cologne" resolve without a country token).
  if (DE_CITIES.some((c) => t.includes(c))) return "DE";
  return "";
}

// ── remote detection + restriction parsing ────────────────────────────────────
const REMOTE_RE = /\b(remote|home\s?office|homeoffice|work from home|fully remote|100% remote)\b/i;

/** Work mode from the job's remote flag or its title/location (NOT description). */
export function jobWorkMode(job: NormalizedJob): WorkMode {
  if (job.remote === true) return "remote";
  const titleLoc = `${job.title} ${job.location ?? ""}`;
  if (REMOTE_RE.test(titleLoc)) return "remote";
  if ((job.location ?? "").trim()) return "onsite";
  return "unknown";
}

export interface RemoteRestrictions {
  countries: string[]; // "DE" | "US" | "EU" …
  workAuthRequired: boolean;
  timezoneBound: boolean;
}

/** Parse explicit remote restrictions from safe text (title + description). */
export function parseRemoteRestrictions(text: string): RemoteRestrictions {
  const t = (text ?? "").toLowerCase();
  const countries: string[] = [];
  if (/\b(germany|deutschland)[\s-]?only\b|based in germany|must reside in germany|residents of germany/.test(t)) countries.push("DE");
  if (/\beu[\s-]?only\b|within the eu\b|eu residents|based in the eu/.test(t)) countries.push("EU");
  if (/\b(us|usa|united states)[\s-]?only\b|must be based in the us|us residents|based in the united states/.test(t)) countries.push("US");
  const workAuthRequired = /work authorization|authorized to work|right to work|eligible to work|visa sponsorship (is )?not/.test(t);
  const timezoneBound = /\btime[\s-]?zone\b|\b(cet|cest|est|pst|gmt|utc[+\-]\d)\b/.test(t);
  return { countries, workAuthRequired, timezoneBound };
}

/** Is the user's country compatible with a set of restriction countries? */
function countryCompatible(prefCountry: string, restrictions: string[]): boolean {
  if (restrictions.length === 0) return true;
  if (!prefCountry) return false; // restricted job + unknown pref → cannot confirm
  if (restrictions.includes(prefCountry)) return true;
  if (restrictions.includes("EU") && EU_COUNTRIES.has(prefCountry)) return true;
  return false;
}

// ── distance service (pluggable; region-match today, km later) ────────────────
export interface DistanceService {
  /** true = within range, false = out of range, "unknown" = cannot tell. */
  inRange(job: NormalizedJob, prefs: SearchLocationPrefs): boolean | "unknown";
}

/** Deterministic country/region match. A real geocoding service can replace it
 *  later to honour radiusKm precisely, without changing evaluateJobLocation. */
export const regionDistanceService: DistanceService = {
  inRange(job, prefs) {
    const jobCountry = resolveCountry(job.location);
    if (!prefs.country) return true; // no country preference → cannot exclude
    if (!jobCountry) return "unknown"; // never guess a job's location
    return jobCountry === prefs.country;
  },
};

/**
 * Decide whether a job survives the location preferences.
 * `restrictionText` should be safe text only (title + description) — no PII.
 */
export function evaluateJobLocation(
  job: NormalizedJob,
  prefs: SearchLocationPrefs,
  distance: DistanceService = regionDistanceService,
  restrictionText = ""
): LocationDecision {
  const mode = jobWorkMode(job);

  if (mode === "remote") {
    const restr = parseRemoteRestrictions(`${job.title} ${restrictionText}`);
    if (restr.countries.length && !countryCompatible(prefs.country ?? "", restr.countries)) {
      return { keep: false, mode, reason: `remote restricted to ${restr.countries.join("/")}` };
    }
    if (prefs.remoteWorldwide) return { keep: true, mode, reason: "remote (worldwide allowed)" };
    // Remote-worldwide off → treat like on-site (must be in region).
    const r = distance.inRange(job, prefs);
    return r === true
      ? { keep: true, mode, reason: "remote within region" }
      : { keep: false, mode, reason: "remote outside region (worldwide off)" };
  }

  if (mode === "onsite") {
    const r = distance.inRange(job, prefs);
    if (r === true) return { keep: true, mode, reason: "on-site within region" };
    if (r === "unknown") return { keep: false, mode, reason: "on-site with unknown location" };
    return { keep: false, mode, reason: "on-site outside region" };
  }

  // unknown location, not remote
  return { keep: false, mode, reason: "unknown location, not remote" };
}

/** True only when the user has set a City or Country. When false, NO location
 *  filter is applied (global search) — a job can never be rejected by location. */
export function isLocationActive(prefs: SearchLocationPrefs): boolean {
  return Boolean((prefs.city ?? "").trim() || (prefs.country ?? "").trim());
}

/** Convenience: build a concise provider location string ("Düsseldorf, Germany"). */
export function providerLocationString(prefs: SearchLocationPrefs): string {
  const country = prefs.country ? countryName(prefs.country) : "";
  return [prefs.city, country].filter(Boolean).join(", ");
}
