// ============================================================================
// resume/resumeDocModel — PURE, framework-independent résumé document model.
// ----------------------------------------------------------------------------
// Centralizes every CONTENT decision shared by the HTML preview (ResumePreview)
// and the FUTURE PDF renderer, so the two can never drift (section visibility,
// meaningful-entry filtering, contact assembly, date-range + meta formatting,
// safe link resolution, display URLs). It reuses the existing, already-tested
// helpers — withFormDataDefaults, hasMeaningful*, safeHref, displayUrl — rather
// than reimplementing any of that logic.
//
// HARD CONSTRAINTS (Phase D Step 2A — dependency-free groundwork):
//   • NO React, NO DOM, NO JSX, NO @react-pdf/renderer, NO dynamic import of it.
//   • This module NEVER renders and NEVER generates a PDF. It only decides WHAT
//     content a résumé document contains and HOW each value should read.
//   • Pure functions only → fully unit-testable in Node.
// ============================================================================

import type {
  ResumeFormData,
  CustomizationSettings,
  LayoutOption,
  LanguageEntry,
  ProjectEntry,
  CertificationEntry,
  ProfessionalLink,
  CustomSection,
} from "@/app/components/resume-builder/types";
import {
  withFormDataDefaults,
  isResumeEmpty,
  hasMeaningfulProject,
  hasMeaningfulCertification,
  hasMeaningfulLink,
  hasMeaningfulCustomItem,
} from "@/lib/resume/importResume";
import { safeHref, displayUrl } from "@/lib/resume/urlSafety";

/* ───────────────────────── Shared formatting helpers ───────────────────────── */

/** Join a start/end date into "start – end", dropping blank ends. Mirrors the
 *  preview's `[a, b].filter(Boolean).join(" – ")` exactly (no trimming, so a
 *  whitespace-only value is treated as the preview treats it). */
export function joinDateRange(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" – ");
}

/** Split a multi-line description into non-empty lines, exactly as the preview's
 *  `description.split("\n").filter(Boolean)`. */
export function descriptionLines(description: string): string[] {
  return (description ?? "").split("\n").filter(Boolean);
}

/* ───────────────────────── Meaningful-entry selectors ───────────────────────── */
// These are the single source of truth for "which rows actually render". They
// are what ResumePreview's shared blocks consume so the filtering lives in ONE
// place. Each reuses the existing hasMeaningful* predicate.

export function meaningfulProjects(f: ResumeFormData): ProjectEntry[] {
  return (f.projects ?? []).filter(hasMeaningfulProject);
}

export function meaningfulCertifications(f: ResumeFormData): CertificationEntry[] {
  return (f.certifications ?? []).filter(hasMeaningfulCertification);
}

export function meaningfulLinks(f: ResumeFormData): ProfessionalLink[] {
  return (f.professionalLinks ?? []).filter(hasMeaningfulLink);
}

/** Custom sections with their items filtered to meaningful ones, keeping only
 *  sections that still have at least one item. Mirrors the preview block. */
export function visibleCustomSections(f: ResumeFormData): CustomSection[] {
  return (f.customSections ?? [])
    .map((sec) => ({ ...sec, items: (sec.items ?? []).filter(hasMeaningfulCustomItem) }))
    .filter((sec) => sec.items.length > 0);
}

/* ───────────────────────── Document model view types ───────────────────────── */

export interface DocContact {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  /** Present, non-empty contact values, in display order. */
  items: string[];
}

export interface DocExperience {
  id: string;
  role: string;        // display value ("Role" when blank)
  company: string;
  dateRange: string;
  lines: string[];     // description, split into bullet lines
}

export interface DocEducation {
  id: string;
  institution: string; // display value ("Institution" when blank)
  degree: string;
  field: string;
  dateRange: string;
}

export interface DocProject {
  id: string;
  name: string;        // display value ("Project" when blank)
  role: string;
  dateRange: string;   // honors `current` → "Present"
  url: string;         // raw display url ("" when none)
  lines: string[];
}

export interface DocCertification {
  id: string;
  name: string;        // display value ("Certification" when blank)
  meta: string;        // "issuer · ID xxx"
  dateRange: string;
  credentialUrl: string;
}

export interface DocLink {
  id: string;
  label: string;
  shown: string;            // displayUrl(raw)
  href: string | null;      // safeHref(raw) or null when not safe to link
}

export interface DocCustomItem {
  id: string;
  heading: string;
  subheading: string;
  date: string;
  shown: string;            // displayUrl(url), "" when no url
  href: string | null;      // safeHref(url) or null
  lines: string[];
}

export interface DocCustomSection {
  id: string;
  title: string;            // display value ("Section" when blank)
  items: DocCustomItem[];
}

export type DocSectionKey =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "links"
  | "customSections"
  | "skills"
  | "languages";

export interface ResumeDocModel {
  isEmpty: boolean;
  layout: LayoutOption;
  fullName: string;         // display value ("Your Name" when blank)
  jobTitle: string;         // display value ("Your Title" when blank)
  photoUrl: string;
  contact: DocContact;
  summary: string;          // "" when none
  skills: string[];
  experience: DocExperience[];
  education: DocEducation[];
  projects: DocProject[];
  certifications: DocCertification[];
  links: DocLink[];
  customSections: DocCustomSection[];
  languages: LanguageEntry[];
  /** Section keys that have content, in canonical (one-column) order. A PDF
   *  renderer can use this for visibility/ordering without re-deriving it. */
  visibleSections: DocSectionKey[];
}

const or = (v: string, fallback: string): string => (v ?? "").trim() || fallback;

/**
 * Build the pure document model from résumé form data + customization settings.
 * Normalizes with withFormDataDefaults first (so résumés saved before newer
 * sections existed read back cleanly), then centralizes every content decision.
 * Pure: never mutates its inputs, never touches the DOM, never generates a PDF.
 */
export function buildResumeDocModel(
  formData: Partial<ResumeFormData> | null | undefined,
  settings: CustomizationSettings
): ResumeDocModel {
  const f = withFormDataDefaults(formData);

  const contactValues = {
    email: f.email.trim(),
    phone: f.phone.trim(),
    location: f.location.trim(),
    linkedin: f.linkedin.trim(),
    website: f.website.trim(),
  };
  const contact: DocContact = {
    ...contactValues,
    items: [contactValues.email, contactValues.phone, contactValues.location, contactValues.linkedin].filter(Boolean),
  };

  const experience: DocExperience[] = f.experience.map((e) => ({
    id: e.id,
    role: or(e.role, "Role"),
    company: e.company,
    dateRange: joinDateRange(e.startDate, e.endDate),
    lines: descriptionLines(e.description),
  }));

  const education: DocEducation[] = f.education.map((e) => ({
    id: e.id,
    institution: or(e.institution, "Institution"),
    degree: e.degree,
    field: e.field,
    dateRange: joinDateRange(e.startDate, e.endDate),
  }));

  const projects: DocProject[] = meaningfulProjects(f).map((p) => {
    const end = p.current ? "Present" : p.endDate;
    return {
      id: p.id,
      name: or(p.name, "Project"),
      role: p.role,
      dateRange: joinDateRange(p.startDate, end),
      url: displayUrl(p.url),
      lines: descriptionLines(p.description),
    };
  });

  const certifications: DocCertification[] = meaningfulCertifications(f).map((c) => ({
    id: c.id,
    name: or(c.name, "Certification"),
    meta: [c.issuer, c.credentialId && `ID ${c.credentialId}`].filter(Boolean).join(" · "),
    dateRange: joinDateRange(c.issueDate, c.expirationDate),
    credentialUrl: displayUrl(c.credentialUrl),
  }));

  const links: DocLink[] = meaningfulLinks(f).map((l) => ({
    id: l.id,
    label: l.label.trim(),
    shown: displayUrl(l.url),
    href: safeHref(l.url),
  }));

  const customSections: DocCustomSection[] = visibleCustomSections(f).map((sec) => ({
    id: sec.id,
    title: or(sec.title, "Section"),
    items: sec.items.map((i) => ({
      id: i.id,
      heading: i.heading.trim(),
      subheading: i.subheading.trim(),
      date: i.date.trim(),
      shown: i.url.trim() ? displayUrl(i.url) : "",
      href: safeHref(i.url),
      lines: descriptionLines(i.description),
    })),
  }));

  const summary = f.summary.trim() ? f.summary : "";

  const visibleSections: DocSectionKey[] = [];
  if (summary) visibleSections.push("summary");
  if (experience.length > 0) visibleSections.push("experience");
  if (education.length > 0) visibleSections.push("education");
  if (projects.length > 0) visibleSections.push("projects");
  if (certifications.length > 0) visibleSections.push("certifications");
  if (links.length > 0) visibleSections.push("links");
  if (customSections.length > 0) visibleSections.push("customSections");
  if (f.skills.length > 0) visibleSections.push("skills");
  if (f.languages.length > 0) visibleSections.push("languages");

  return {
    isEmpty: isResumeEmpty(f),
    layout: settings.layout,
    fullName: or(f.fullName, "Your Name"),
    jobTitle: or(f.jobTitle, "Your Title"),
    photoUrl: f.photoUrl,
    contact,
    summary,
    skills: [...f.skills],
    experience,
    education,
    projects,
    certifications,
    links,
    customSections,
    languages: [...f.languages],
    visibleSections,
  };
}
