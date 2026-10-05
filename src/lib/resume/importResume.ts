// ============================================================================
// resume/importResume — PURE merge/replace logic for résumé import (Step 3)
// ----------------------------------------------------------------------------
// Turns a factual ResumeParseDraft (from /api/resume/parse) into Resume Builder
// form data, either by REPLACING the current résumé or deterministically
// MERGING into it. No AI, no network, no React → fully unit-testable.
//
// SAFETY: merge never overwrites a non-empty user value; it only fills blanks
// and appends de-duplicated list items. Merge is 100% deterministic (no AI).
// `unmappedText` is intentionally NOT written into any form field (the model has
// no field for it) — the review UI shows it so the user can use it manually.
// ============================================================================

import type {
  ResumeFormData,
  ExperienceEntry,
  EducationEntry,
  LanguageEntry,
  ProjectEntry,
  CertificationEntry,
  ProfessionalLink,
  CustomSection,
  CustomSectionItem,
} from "@/app/components/resume-builder/types";
import type { ResumeParseDraft, ParsedLanguageEntry } from "@/lib/resume/parseResumeDraft";

export type ImportMode = "replace" | "merge";

/** The canonical all-empty résumé shape. */
export const EMPTY_RESUME_FORM_DATA: ResumeFormData = {
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "",
  linkedin: "", photoUrl: "", summary: "", skills: [], experience: [], education: [],
  languages: [], projects: [], certifications: [], professionalLinks: [], customSections: [],
};

/**
 * Fill any missing fields on a (possibly older / partial) saved formData with
 * empty defaults — so a résumé saved before newer sections existed reads back
 * with `projects: []`, `certifications: []`, etc. Pure; never mutates the input.
 */
export function withFormDataDefaults(partial: Partial<ResumeFormData> | null | undefined): ResumeFormData {
  const p = partial ?? {};
  // Fresh array copies so the returned snapshot never shares the module-level
  // EMPTY_RESUME_FORM_DATA arrays (which would let one résumé mutate the default).
  return {
    ...EMPTY_RESUME_FORM_DATA,
    ...p,
    skills: [...(p.skills ?? [])],
    experience: [...(p.experience ?? [])],
    education: [...(p.education ?? [])],
    languages: [...(p.languages ?? [])],
    projects: [...(p.projects ?? [])],
    certifications: [...(p.certifications ?? [])],
    professionalLinks: [...(p.professionalLinks ?? [])],
    customSections: (p.customSections ?? []).map((sec) => ({ ...sec, items: [...(sec.items ?? [])] })),
  };
}

// Undetected proficiency is represented as "" (not specified). We NEVER infer a
// level that was not stated in the résumé; the form offers a "Not specified"
// option and the preview renders no level when proficiency is "".

const norm = (s: string): string => s.trim().toLowerCase();

/** A project row counts as real content only with a name or a description
 *  (a blank/placeholder row must not make a résumé non-empty). */
export function hasMeaningfulProject(p: ProjectEntry): boolean {
  return !!(p.name?.trim() || p.description?.trim());
}

/** A certification row counts as real content only with a name or issuer. */
export function hasMeaningfulCertification(c: CertificationEntry): boolean {
  return !!(c.name?.trim() || c.issuer?.trim());
}

/** A professional link counts only with an actual URL. */
export function hasMeaningfulLink(l: ProfessionalLink): boolean {
  return !!l.url?.trim();
}

/** A custom-section item counts only with a heading, description, subheading, or URL. */
export function hasMeaningfulCustomItem(i: CustomSectionItem): boolean {
  return !!(i.heading?.trim() || i.description?.trim() || i.subheading?.trim() || i.url?.trim());
}

/** A custom section counts only when it has at least one meaningful item
 *  (a title alone does NOT make a résumé non-empty). */
export function hasMeaningfulCustomSection(s: CustomSection): boolean {
  return (s.items ?? []).some(hasMeaningfulCustomItem);
}

/** Resolve a parsed language (proficiency may be "") into a real LanguageEntry. */
function resolveLanguage(l: ParsedLanguageEntry): LanguageEntry {
  return {
    id: l.id,
    language: l.language,
    proficiency: l.proficiency, // "" (not specified) is preserved; never inferred
  };
}

/** Convert a parsed draft into Resume Builder form data (used by REPLACE and
 *  by the empty/pristine "apply" path). */
export function draftToFormData(draft: ResumeParseDraft): ResumeFormData {
  return {
    fullName: draft.fullName,
    jobTitle: draft.jobTitle,
    email: draft.email,
    phone: draft.phone,
    location: draft.location,
    website: draft.website,
    linkedin: draft.linkedin,
    photoUrl: "",
    summary: draft.summary,
    skills: [...draft.skills],
    experience: draft.experience.map((e) => ({ ...e })),
    education: draft.education.map((e) => ({ ...e })),
    languages: draft.languages.map(resolveLanguage),
    projects: draft.projects.map((e) => ({ ...e })),
    certifications: draft.certifications.map((e) => ({ ...e })),
    professionalLinks: draft.professionalLinks.map((e) => ({ ...e })),
    customSections: draft.customSections.map((sec) => ({ ...sec, items: sec.items.map((i) => ({ ...i })) })),
  };
}

/** True only when a résumé has no meaningful user content at all. (The Builder
 *  seeds sample placeholder data, so callers usually detect "pristine sample"
 *  separately; this is the strict all-empty check, handy for tests/guards.) */
export function isResumeEmpty(f: ResumeFormData): boolean {
  const scalars = [f.fullName, f.jobTitle, f.email, f.phone, f.location, f.website, f.linkedin, f.summary];
  const anyScalar = scalars.some((s) => (s ?? "").trim().length > 0);
  return (
    !anyScalar &&
    f.skills.length === 0 &&
    f.experience.length === 0 &&
    f.education.length === 0 &&
    f.languages.length === 0 &&
    !(f.projects ?? []).some(hasMeaningfulProject) &&
    !(f.certifications ?? []).some(hasMeaningfulCertification) &&
    !(f.professionalLinks ?? []).some(hasMeaningfulLink) &&
    !(f.customSections ?? []).some(hasMeaningfulCustomSection)
  );
}

const fillScalar = (existing: string, incoming: string): string =>
  existing.trim().length > 0 ? existing : incoming;

function mergeSkills(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  const seen = new Set(existing.map(norm));
  for (const s of incoming) {
    const key = norm(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

const expKey = (e: ExperienceEntry): string =>
  [norm(e.company), norm(e.role), norm(e.startDate), norm(e.endDate)].join("|");

function mergeExperience(existing: ExperienceEntry[], incoming: ExperienceEntry[]): ExperienceEntry[] {
  const out = [...existing];
  const seen = new Set(existing.map(expKey));
  for (const e of incoming) {
    const key = expKey(e);
    if (seen.has(key)) continue; // duplicate role at same company/dates
    seen.add(key);
    out.push({ ...e });
  }
  return out;
}

const eduKey = (e: EducationEntry): string =>
  [norm(e.institution), norm(e.degree), norm(e.field), norm(e.startDate), norm(e.endDate)].join("|");

function mergeEducation(existing: EducationEntry[], incoming: EducationEntry[]): EducationEntry[] {
  const out = [...existing];
  const seen = new Set(existing.map(eduKey));
  for (const e of incoming) {
    const key = eduKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...e });
  }
  return out;
}

function mergeLanguages(existing: LanguageEntry[], incoming: ParsedLanguageEntry[]): LanguageEntry[] {
  const out = [...existing];
  const seen = new Set(existing.map((l) => norm(l.language)));
  for (const l of incoming) {
    const key = norm(l.language);
    if (!key || seen.has(key)) continue; // existing wins on a language already present
    seen.add(key);
    out.push(resolveLanguage(l));
  }
  return out;
}

const projKey = (p: ProjectEntry): string => {
  const name = norm(p.name);
  // Conservative: name + URL when a URL exists, otherwise name + date range.
  return p.url?.trim()
    ? `${name}|${norm(p.url)}`
    : `${name}|${norm(p.startDate)}|${norm(p.endDate)}`;
};

function mergeProjects(existing: ProjectEntry[], incoming: ProjectEntry[]): ProjectEntry[] {
  const out = [...existing];
  const seen = new Set(existing.map(projKey));
  for (const p of incoming) {
    const key = projKey(p);
    if (seen.has(key)) continue; // existing wins on a true duplicate
    seen.add(key);
    out.push({ ...p });
  }
  return out;
}

const certKey = (c: CertificationEntry): string => {
  // Credential ID is strong evidence of identity when present; otherwise name + issuer.
  const id = norm(c.credentialId);
  return id ? `id:${id}` : `${norm(c.name)}|${norm(c.issuer)}`;
};

function mergeCertifications(existing: CertificationEntry[], incoming: CertificationEntry[]): CertificationEntry[] {
  const out = [...existing];
  const seen = new Set(existing.map(certKey));
  for (const c of incoming) {
    const key = certKey(c);
    if (seen.has(key)) continue; // existing wins on a true duplicate
    seen.add(key);
    out.push({ ...c });
  }
  return out;
}

const linkKey = (l: ProfessionalLink): string => norm(l.url); // URL identity, label-independent

function mergeProfessionalLinks(existing: ProfessionalLink[], incoming: ProfessionalLink[]): ProfessionalLink[] {
  const out = [...existing];
  const seen = new Set(existing.map(linkKey));
  for (const l of incoming) {
    const key = linkKey(l);
    if (!key || seen.has(key)) continue; // existing wins on the same URL, even if labels differ
    seen.add(key);
    out.push({ ...l });
  }
  return out;
}

const customItemKey = (i: CustomSectionItem): string =>
  [norm(i.heading), norm(i.subheading), norm(i.date), norm(i.url)].join("|");

function mergeCustomItems(existing: CustomSectionItem[], incoming: CustomSectionItem[]): CustomSectionItem[] {
  const out = [...existing];
  const seen = new Set(existing.map(customItemKey));
  for (const i of incoming) {
    const key = customItemKey(i);
    if (seen.has(key)) continue; // conservative: identical heading+subheading+date+url → duplicate
    seen.add(key);
    out.push({ ...i });
  }
  return out;
}

function mergeCustomSections(existing: CustomSection[], incoming: CustomSection[]): CustomSection[] {
  const out = existing.map((sec) => ({ ...sec, items: [...sec.items] }));
  const indexByTitle = new Map<string, number>();
  out.forEach((sec, idx) => indexByTitle.set(norm(sec.title), idx));
  for (const sec of incoming) {
    const key = norm(sec.title);
    const at = indexByTitle.get(key);
    if (at !== undefined) {
      // Same section title: merge items conservatively into the existing section.
      out[at] = { ...out[at], items: mergeCustomItems(out[at].items, sec.items) };
    } else {
      indexByTitle.set(key, out.length);
      out.push({ ...sec, items: [...sec.items] });
    }
  }
  return out;
}

/**
 * Apply an imported draft to the current résumé.
 *  - "replace": the draft fully replaces the current résumé.
 *  - "merge":  existing non-empty scalar values win; blanks are filled from the
 *              draft; skills/experience/education/languages are appended with
 *              de-duplication. Deterministic; no AI.
 */
export function mergeResumeDraft(
  existing: ResumeFormData,
  draft: ResumeParseDraft,
  mode: ImportMode
): ResumeFormData {
  if (mode === "replace") return draftToFormData(draft);

  return {
    fullName: fillScalar(existing.fullName, draft.fullName),
    jobTitle: fillScalar(existing.jobTitle, draft.jobTitle),
    email: fillScalar(existing.email, draft.email),
    phone: fillScalar(existing.phone, draft.phone),
    location: fillScalar(existing.location, draft.location),
    website: fillScalar(existing.website, draft.website),
    linkedin: fillScalar(existing.linkedin, draft.linkedin),
    photoUrl: existing.photoUrl, // never comes from text; keep the user's
    summary: fillScalar(existing.summary, draft.summary),
    skills: mergeSkills(existing.skills, draft.skills),
    experience: mergeExperience(existing.experience, draft.experience),
    education: mergeEducation(existing.education, draft.education),
    languages: mergeLanguages(existing.languages, draft.languages),
    projects: mergeProjects(existing.projects ?? [], draft.projects),
    certifications: mergeCertifications(existing.certifications ?? [], draft.certifications),
    professionalLinks: mergeProfessionalLinks(existing.professionalLinks ?? [], draft.professionalLinks),
    customSections: mergeCustomSections(existing.customSections ?? [], draft.customSections),
  };
}
