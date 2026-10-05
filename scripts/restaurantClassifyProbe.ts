// Offline probe for the restaurant classifier. Reproduces the EXACT dev
// diagnostics the live workflow now prints, against representative real
// Jooble-style German titles for a Restaurant Manager / Cologne search.
//
// It runs the SAME titles twice:
//   (A) intent.profession = "Restaurant Manager"  → family should be "restaurant"
//   (B) intent.profession = "Manager" (generic)   → family "generic", all rejected
// so the effect of the resolved FAMILY on the outcome is unmistakable.
//
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs scripts/restaurantClassifyProbe.ts
import { explainJobDomain } from "@/lib/jobs/relevance";
import type { NormalizedJob } from "@/lib/jobs/types";

const job = (title: string, description = "", location = "Köln"): NormalizedJob => ({
  externalId: title, provider: "jooble", title, company: "C", location, remote: false,
  description, tags: [], jobTypes: [], publishedAt: null, sourceUrl: "https://x/1", applyUrl: "https://x/1",
});

// Representative real Jooble Cologne titles (including HTML entities & unicode
// dashes that providers commonly emit) + realistic off-domain noise.
const TITLES: NormalizedJob[] = [
  job("Restaurantleiter (m/w/d)"),
  job("Restaurantleitung"),
  job("Stellvertretende Restaurantleitung (m/w/d)"),
  job("Gastronomieleiter (m/w/d)"),
  job("Betriebsleiter Gastronomie (m/w/d)"),
  job("F&amp;B Manager (m/w/d)"),                        // HTML entity for &
  job("Food &amp; Beverage Manager (m/w/d)"),            // HTML entity for &
  job("Hospitality Manager (m/w/d) – Vollzeit"),   // unicode en-dash
  job("Serviceleiter (m/w/d)", "Leitung des Restaurant-Serviceteams."),
  job("Küchenleiter (m/w/d)", "Küchenbrigade in unserem Hotel-Restaurant."),
  job("Assistant Restaurant Manager"),
  job("Schichtleiter", "Systemgastronomie / Food & Beverage."),
  job("Operations Manager", "Restaurant operations across five sites."),
  // off-domain noise that must stay rejected
  job("Automotive Manager", "Autohaus."),
  job("Financial Manager", "Budgets and forecasting."),
  job("Contract Manager", "Draft and negotiate contracts."),
  job("Inventory Manager", "Warehouse logistics."),
  job("IT Support Specialist", "1st/2nd level."),
];

function dump(label: string, profession: string, requiredDomainTerms: string[]) {
  const intent = { profession, requiredDomainTerms };
  console.log(`\n================ ${label} (profession=${JSON.stringify(profession)}) ================`);
  let exact = 0, adjacent = 0, rejected = 0;
  for (const j of TITLES) {
    const ex = explainJobDomain(j, intent);
    if (ex.kind === "exact") exact++; else if (ex.kind === "adjacent") adjacent++; else rejected++;
    console.log(
      "\n[JOB CLASSIFICATION]" +
      `\nTitle: ${j.title}` +
      `\nProvider: ${j.provider}` +
      `\nLocation: ${j.location ?? "(none)"}` +
      `\nFamily: ${ex.family}` +
      `\nResult: ${ex.kind}` +
      `\nReason: ${ex.reason}` +
      `\nMatched: ${ex.matched.length ? ex.matched.join(", ") : "(none)"}` +
      `\nMissing evidence: ${ex.missing.length ? ex.missing.join(", ") : "(n/a)"}` +
      "\n[/JOB CLASSIFICATION]"
    );
  }
  console.log(`\n--- ${label}: exact=${exact} adjacent=${adjacent} rejected=${rejected} (of ${TITLES.length}) ---`);
}

// (A) correct profession → restaurant family
dump("A · restaurant profession", "Restaurant Manager", ["restaurant", "gastronomie", "hospitality"]);
// (B) generic profession (the suspected live cause) → generic family, all rejected
dump("B · generic profession", "Manager", []);
