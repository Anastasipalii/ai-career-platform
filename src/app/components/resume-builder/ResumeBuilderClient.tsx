"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ResumeFormData,
  CustomizationSettings,
  TemplateKey,
} from "@/app/components/resume-builder/types";
import ResumeHero from "@/app/components/resume-builder/ResumeHero";
import ResumeForm from "@/app/components/resume-builder/ResumeForm";
import ResumeTemplates from "@/app/components/resume-builder/ResumeTemplates";
import CustomizationPanel from "@/app/components/resume-builder/CustomizationPanel";
import AIFeaturesPanel from "@/app/components/resume-builder/AIFeaturesPanel";
import ResumePreview from "@/app/components/resume-builder/ResumePreview";
import ExportSection from "@/app/components/resume-builder/ExportSection";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/* ─── Initial data ─── */
const INITIAL_FORM_DATA: ResumeFormData = {
  fullName: "Alexandra Chen",
  jobTitle: "Senior Product Designer",
  email: "alex.chen@email.com",
  phone: "+1 (415) 555-0182",
  location: "San Francisco, CA",
  website: "alexchen.design",
  linkedin: "linkedin.com/in/alexchen",
  photoUrl: "",
  summary:
    "Senior Product Designer with 6+ years crafting AI-powered products at scale. Led design systems and zero-to-one products at Vercel and Linear. Passionate about accessibility, data-driven UX, and building design infrastructure that ships fast.",
  skills: [
    "Figma",
    "UX Research",
    "Design Systems",
    "Prototyping",
    "AI/ML Products",
    "React",
    "Accessibility",
    "A/B Testing",
  ],
  experience: [
    {
      id: "exp-1",
      company: "Vercel",
      role: "Senior Product Designer",
      startDate: "Mar 2022",
      endDate: "Present",
      description:
        "Led design for AI-powered developer tools used by 1M+ developers.\nBuilt and maintained Vercel's design system across 12 product surfaces.\nDrove 34% increase in deployment success rate through UX improvements.",
    },
    {
      id: "exp-2",
      company: "Linear",
      role: "Product Designer",
      startDate: "Jun 2020",
      endDate: "Feb 2022",
      description:
        "Designed core issue tracking and project management workflows.\nReduced onboarding time by 40% through progressive disclosure redesign.\nCollaborated with engineering on React component library.",
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "UC Berkeley",
      degree: "Bachelor of Arts",
      field: "Cognitive Science & HCI",
      startDate: "Sep 2016",
      endDate: "May 2020",
    },
  ],
  languages: [
    { id: "lang-1", language: "English", proficiency: "Native" },
    { id: "lang-2", language: "Mandarin", proficiency: "Fluent" },
  ],
};

const INITIAL_SETTINGS: CustomizationSettings = {
  colorTheme: "Purple Neon",
  font: "Minimal",
  layout: "One-column",
  spacing: "Balanced",
};

/* ─── Template presets ─── */
const TEMPLATE_PRESETS: Record<TemplateKey, CustomizationSettings> = {
  Minimal:       { colorTheme: "Minimal Gray",   font: "Minimal",      layout: "One-column",  spacing: "Balanced" },
  Corporate:     { colorTheme: "Navy Blue",       font: "Professional", layout: "Two-column",  spacing: "Compact" },
  Creative:      { colorTheme: "Purple Neon",     font: "Creative",     layout: "Sidebar",     spacing: "Spacious" },
  "Modern Tech": { colorTheme: "Emerald Green",   font: "ModernSans",   layout: "Modern card", spacing: "Balanced" },
};

export default function ResumeBuilderClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<ResumeFormData>(INITIAL_FORM_DATA);
  const [settings, setSettings] = useState<CustomizationSettings>(INITIAL_SETTINGS);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("Creative");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplate(key);
    setSettings(TEMPLATE_PRESETS[key]);
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaveStatus("idle");
      router.push("/login");
      return;
    }

    const title =
      [formData.fullName, formData.jobTitle].filter(Boolean).join(" — ") ||
      "Untitled Resume";

    const sharedPayload = {
      title,
      language: formData.languages[0]?.language ?? "English (US)",
      template_name: selectedTemplate,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: { formData, settings } as any,
    };

    if (resumeId) {
      const { error } = await supabase
        .from("resumes")
        .update(sharedPayload)
        .eq("id", resumeId);
      if (error) { setSaveStatus("error"); return; }
    } else {
      const { data, error } = await supabase
        .from("resumes")
        .insert({ ...sharedPayload, user_id: session.user.id })
        .select("id")
        .single();
      if (error || !data) { setSaveStatus("error"); return; }
      setResumeId((data as { id: string }).id);
    }

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  return (
    <>
      <ResumeHero />
      <div className="section-divider" />

      {/* ── Builder ── */}
      <section className="py-16 relative">
        {/* Background orb */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Resume builder
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — form */}
            <ResumeForm formData={formData} onChange={setFormData} />

            {/* Right — sticky panel */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <CustomizationPanel settings={settings} onChange={setSettings} />
              <ResumePreview formData={formData} settings={settings} />
              <ExportSection
                formData={formData}
                onSave={handleSave}
                saveStatus={saveStatus}
                isSaved={resumeId !== null}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <ResumeTemplates selectedTemplate={selectedTemplate} onSelect={handleSelectTemplate} />
      <div className="section-divider" />
      <AIFeaturesPanel />
    </>
  );
}
