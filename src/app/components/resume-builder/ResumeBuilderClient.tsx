"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/formatRelative";
import {
  ResumeFormData,
  CustomizationSettings,
  TemplateKey,
  FontOption,
} from "@/app/components/resume-builder/types";
import Toast from "@/app/components/ui/Toast";
import ResumeHero from "@/app/components/resume-builder/ResumeHero";
import ResumeForm from "@/app/components/resume-builder/ResumeForm";
import AIAssistantPanel from "@/app/components/resume-builder/AIAssistantPanel";
import ResumeAnalysisPanel from "@/app/components/resume-builder/ResumeAnalysisPanel";
import ResumeViewModal from "@/app/components/resume-builder/ResumeViewModal";
import ConfirmDialog from "@/app/components/resume-builder/ConfirmDialog";
import CustomizationPanel from "@/app/components/resume-builder/CustomizationPanel";
import ResumePreview from "@/app/components/resume-builder/ResumePreview";
import ExportSection from "@/app/components/resume-builder/ExportSection";
import ResumeImportPanel from "@/app/components/resume-builder/ResumeImportPanel";
import { isResumeEmpty, withFormDataDefaults } from "@/lib/resume/importResume";
import { serializeResumeState } from "@/lib/resume/dirtyState";

// ── Public types used by ExportSection ─────────────────────────────────────
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PdfStatus  = "idle" | "generating";

// ── Print font stacks (no CSS variables — resolved at print time) ───────────
const PRINT_FONT_STACKS: Record<FontOption, string> = {
  Minimal:      "system-ui, -apple-system, Arial, sans-serif",
  Professional: "Georgia, 'Times New Roman', serif",
  Creative:     "'Trebuchet MS', Optima, Arial, sans-serif",
  ModernSans:   "'Courier New', Courier, monospace",
  Elegant:      "Palatino, 'Palatino Linotype', 'Book Antiqua', serif",
};

// ── Saved resume shape (content is the JSONB blob from Supabase) ───────────
interface ResumeContent {
  formData: ResumeFormData;
  settings: CustomizationSettings;
}

interface SavedResumeRecord {
  id: string;
  title: string;
  language: string;
  template_name: string | null;
  ats_score: number | null;
  content: ResumeContent;
  updated_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const TEMPLATE_KEYS: readonly TemplateKey[] = ["Minimal", "Corporate", "Creative", "Modern Tech"];
function isTemplateKey(s: string | null): s is TemplateKey {
  return s !== null && (TEMPLATE_KEYS as readonly string[]).includes(s);
}

// ── Initial data ─────────────────────────────────────────────────────────────
const INITIAL_FORM_DATA: ResumeFormData = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  photoUrl: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  languages: [],
  projects: [],
  certifications: [],
  professionalLinks: [],
  customSections: [],
};

const INITIAL_SETTINGS: CustomizationSettings = {
  colorTheme: "Purple Neon",
  font: "Minimal",
  layout: "One-column",
  spacing: "Balanced",
};

const TEMPLATE_PRESETS: Record<TemplateKey, CustomizationSettings> = {
  Minimal:       { colorTheme: "Minimal Gray",   font: "Minimal",      layout: "One-column",  spacing: "Balanced" },
  Corporate:     { colorTheme: "Navy Blue",       font: "Professional", layout: "Two-column",  spacing: "Compact" },
  Creative:      { colorTheme: "Purple Neon",     font: "Creative",     layout: "Sidebar",     spacing: "Spacious" },
  "Modern Tech": { colorTheme: "Emerald Green",   font: "ModernSans",   layout: "Modern card", spacing: "Balanced" },
};

// ── Props ────────────────────────────────────────────────────────────────────
interface ResumeBuilderClientProps {
  initialResumeId?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ResumeBuilderClient({ initialResumeId }: ResumeBuilderClientProps) {
  const router = useRouter();

  const [formData, setFormData]           = useState<ResumeFormData>(INITIAL_FORM_DATA);
  const [settings, setSettings]           = useState<CustomizationSettings>(INITIAL_SETTINGS);
  // Read-only "View" of a saved résumé. A snapshot only — viewing never touches
  // the builder's formData/settings/resumeId, Supabase, AI, or analysis, so any
  // unsaved builder work stays intact while the modal is open.
  const [viewState, setViewState] = useState<{
    record: SavedResumeRecord;
    formData: ResumeFormData;
    settings: CustomizationSettings;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("Creative");
  const [resumeId, setResumeId]           = useState<string | null>(null);
  // Serialized snapshot of the last safe state; the résumé is dirty when the
  // current serialization differs from it. Seeded to the empty résumé (clean).
  const [baseline, setBaseline] = useState<string>(() =>
    serializeResumeState(INITIAL_FORM_DATA, INITIAL_SETTINGS, "Creative")
  );
  // A saved résumé the user asked to edit while the builder has unsaved changes.
  const [pendingLoad, setPendingLoad] = useState<SavedResumeRecord | null>(null);
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>("idle");
  const [pdfStatus, setPdfStatus]         = useState<PdfStatus>("idle");
  const [toast, setToast]                 = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [myResumes, setMyResumes]         = useState<SavedResumeRecord[]>([]);
  const [showImport, setShowImport]       = useState(false);

  // ── Utilities ──────────────────────────────────────────────────────────────

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Apply an imported résumé draft to the builder (explicit user action;
  // never auto-saved). Merge/replace is decided in ResumeImportPanel.
  const handleImportApply = useCallback((next: ResumeFormData, mode: "import" | "merge" | "replace") => {
    setFormData(next);
    const msg =
      mode === "merge" ? "Résumé merged successfully."
      : mode === "replace" ? "Résumé replaced successfully."
      : "Résumé imported successfully.";
    showToast(msg, "success");
  }, [showToast]);

  const fetchMyResumes = useCallback(async (uid: string): Promise<SavedResumeRecord[]> => {
    const { data } = await supabase
      .from("resumes")
      .select("id, title, language, template_name, ats_score, content, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    return (data ?? []) as unknown as SavedResumeRecord[];
  }, []);

  const loadRecord = useCallback((record: SavedResumeRecord) => {
    // Backward compatibility: résumés saved before Projects/Certifications existed
    // have no such keys — normalize through the SAME canonical helper the View
    // surfaces use (withFormDataDefaults), so Edit and View load identically and
    // a loaded résumé never shares the module-level INITIAL_FORM_DATA arrays.
    const nextFormData = withFormDataDefaults(record.content?.formData);
    const nextSettings = record.content?.settings ?? INITIAL_SETTINGS;
    const nextTemplate = isTemplateKey(record.template_name) ? record.template_name : "Creative";
    setFormData(nextFormData);
    setSettings(nextSettings);
    setSelectedTemplate(nextTemplate);
    setResumeId(record.id);
    // A freshly-loaded résumé is the new clean baseline.
    setBaseline(serializeResumeState(nextFormData, nextSettings, nextTemplate));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Mount: load list + optionally pre-load a specific resume ───────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const records = await fetchMyResumes(session.user.id);
      setMyResumes(records);

      if (initialResumeId) {
        const target = records.find((r) => r.id === initialResumeId);
        if (target) loadRecord(target);
      }
    }
    init();
  }, [initialResumeId, fetchMyResumes, loadRecord]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplate(key);
    setSettings(TEMPLATE_PRESETS[key]);
  };

  const handleAiUpdate = useCallback((updates: Partial<ResumeFormData>) => {
    setFormData((current) => ({ ...current, ...updates }));
  }, []);

  const handleSave = async () => {
    if (isResumeEmpty(formData)) {
      showToast("Add some résumé information before saving.", "error");
      return;
    }
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

    const payload = {
      title,
      language: formData.languages[0]?.language ?? "English (US)",
      template_name: selectedTemplate,
      content: { formData, settings } as unknown as Record<string, unknown>,
    };

    const resetErrorAfterDelay = (msg: string) => {
      setSaveStatus("error");
      showToast(msg, "error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    };

    if (resumeId) {
      const { error } = await supabase
        .from("resumes")
        .update(payload)
        .eq("id", resumeId);
      if (error) { resetErrorAfterDelay(`Save failed: ${error.message}`); return; }
    } else {
      const { data, error } = await supabase
        .from("resumes")
        .insert({ ...payload, user_id: session.user.id })
        .select("id")
        .single();
      if (error || !data) {
        resetErrorAfterDelay(error?.message ?? "Save failed. Please try again.");
        return;
      }
      setResumeId((data as { id: string }).id);
    }

    const records = await fetchMyResumes(session.user.id);
    setMyResumes(records);

    // Successful save: the current content becomes the clean baseline.
    setBaseline(serializeResumeState(formData, settings, selectedTemplate));
    setSaveStatus("saved");
    showToast("Résumé saved successfully.", "success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const handleDownload = () => {
    const resumeEl = document.getElementById("resume-document");
    if (!resumeEl) {
      showToast("Resume preview not found. Please try again.", "error");
      return;
    }

    setPdfStatus("generating");

    const fontFamily = PRINT_FONT_STACKS[settings.font];
    const filename = formData.fullName
      ? `${formData.fullName.toLowerCase().replace(/\s+/g, "-")}-resume`
      : "my-resume";

    const printWin = window.open("", "_blank", "width=850,height=1100");
    if (!printWin) {
      setPdfStatus("idle");
      showToast("Popups are blocked. Please allow popups and try again.", "error");
      return;
    }

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontFamily}; background: #ffffff; }
    @page { margin: 0; size: A4 portrait; }
    @media print {
      html, body { width: 210mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${resumeEl.innerHTML}</body>
</html>`);

    printWin.document.close();
    showToast("PDF export opened.", "success");

    // Close ONLY this temporary popup once the browser's print/export lifecycle
    // ends. `afterprint` fires for BOTH Save and Cancel in modern browsers. We
    // never close the main Resume Builder window and never clear résumé state.
    printWin.onafterprint = () => {
      try { printWin.close(); } catch { /* already closed by the user */ }
    };

    // The 700ms only delays OPENING the print dialog so the popup can render —
    // it never force-closes the window.
    setTimeout(() => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        // Dialog blocked or window already closed by the user.
      }
      setPdfStatus("idle");
    }, 700);
  };

  const handleView = useCallback((record: SavedResumeRecord) => {
    // Normalise the saved snapshot (older résumés may lack newer fields) without
    // mutating anything: no setFormData/setSettings/setResumeId, no persistence.
    setViewState({
      record,
      formData: withFormDataDefaults(record.content?.formData),
      settings: record.content?.settings ?? INITIAL_SETTINGS,
    });
  }, []);

  // Dirty when the live content differs from the last safe baseline.
  const isDirty = serializeResumeState(formData, settings, selectedTemplate) !== baseline;

  // Guard destructive replacement: if there are unsaved changes, ask first.
  const requestLoadRecord = (record: SavedResumeRecord) => {
    if (isDirty) setPendingLoad(record);
    else loadRecord(record);
  };

  const confirmPendingLoad = () => {
    setPendingLoad((rec) => {
      if (rec) loadRecord(rec);
      return null;
    });
  };

  const handleViewEdit = useCallback(() => {
    setViewState((current) => {
      if (current) requestLoadRecord(current.record); // guarded like the card's Edit
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, baseline, loadRecord]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this resume? This cannot be undone.")) return;

    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) {
      showToast("Failed to delete resume.", "error");
      return;
    }

    setMyResumes((prev) => prev.filter((r) => r.id !== id));

    if (resumeId === id) {
      setResumeId(null);
      setFormData(INITIAL_FORM_DATA);
      setSettings(INITIAL_SETTINGS);
      setSelectedTemplate("Creative");
      setBaseline(serializeResumeState(INITIAL_FORM_DATA, INITIAL_SETTINGS, "Creative"));
    }

    showToast("Resume deleted.", "success");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ResumeHero />
      <div className="section-divider" />

      {/* ── Builder ── */}
      <section id="builder" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Resume builder
            </span>
            <div className="section-divider flex-1" />
          </div>

          {/* Import existing résumé (Step 3) */}
          {showImport ? (
            <ResumeImportPanel
              existingData={formData}
              hasExistingData={resumeId !== null || !isResumeEmpty(formData)}
              onApply={handleImportApply}
              onClose={() => setShowImport(false)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-[12.5px] text-slate-400">Start from scratch, or</span>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-200 border transition-colors hover:text-white"
                style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}
              >
                Import existing résumé
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — form + AI assistant */}
            <div className="flex flex-col gap-5">
              <ResumeForm formData={formData} onChange={setFormData} />
              <AIAssistantPanel formData={formData} onUpdate={handleAiUpdate} />
            </div>

            {/* Right — preview + customize + export */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-4">
              <ResumePreview formData={formData} settings={settings} />
              <CustomizationPanel settings={settings} onChange={setSettings} />
              <ExportSection
                formData={formData}
                onSave={handleSave}
                onDownload={handleDownload}
                onToast={showToast}
                saveStatus={saveStatus}
                pdfStatus={pdfStatus}
                isSaved={resumeId !== null}
              />
              <p className="text-xs text-slate-600 text-center px-2">
                AI-powered writing and formatting assistance included.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ResumeAnalysisPanel formData={formData} onUpdate={handleAiUpdate} />

      {/* ── My Resumes ── */}
      {myResumes.length > 0 && (
        <>
          <div className="section-divider" />
          <MyResumesSection
            resumes={myResumes}
            activeId={resumeId}
            onOpen={requestLoadRecord}
            onView={handleView}
            onDelete={handleDelete}
          />
        </>
      )}

      {viewState && (
        <ResumeViewModal
          title={viewState.record.title}
          formData={viewState.formData}
          settings={viewState.settings}
          onClose={() => setViewState(null)}
          onEdit={handleViewEdit}
        />
      )}

      {pendingLoad && (
        <ConfirmDialog
          title="Unsaved changes"
          message="You have unsaved changes. If you continue, those changes will be lost."
          confirmLabel="Discard changes and continue"
          onConfirm={confirmPendingLoad}
          onCancel={() => setPendingLoad(null)}
        />
      )}

      {/* ── Built-in features ── */}
      <div className="section-divider" />
      <section className="py-24 relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.05) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
              style={{ borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)" }}
            >
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#c4b5fd" }}>
                Built-in features
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Everything you need{" "}
              <span className="gradient-text">in one place</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Professional resume features built directly into the builder — no extra tools needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* ATS-Friendly */}
            <div className="feature-card">
              <div
                className="feature-card-glow"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 55%)" }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base mb-2 leading-snug">ATS-Friendly</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Optimize your resume for recruiter systems and automated screenings.
              </p>
            </div>

            {/* Multiple Languages */}
            <div className="feature-card">
              <div
                className="feature-card-glow"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.1) 0%, transparent 55%)" }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base mb-2 leading-snug">Multiple Languages</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Create resumes in multiple languages including Arabic.
              </p>
            </div>

            {/* One-Click Export */}
            <div className="feature-card">
              <div
                className="feature-card-glow"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 55%)" }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base mb-2 leading-snug">One-Click Export</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Download clean PDF resumes instantly or save them to your dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

// ── My Resumes section ────────────────────────────────────────────────────────
function MyResumesSection({
  resumes,
  activeId,
  onOpen,
  onView,
  onDelete,
}: {
  resumes: SavedResumeRecord[];
  activeId: string | null;
  onOpen: (record: SavedResumeRecord) => void;
  onView: (record: SavedResumeRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="section-divider flex-1" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
            My resumes
          </span>
          <div className="section-divider flex-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resumes.map((record) => (
            <ResumeCard
              key={record.id}
              record={record}
              isActive={activeId === record.id}
              onOpen={() => onOpen(record)}
              onView={() => onView(record)}
              onDelete={() => onDelete(record.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Individual resume card ────────────────────────────────────────────────────
function ResumeCard({
  record,
  isActive,
  onOpen,
  onView,
  onDelete,
}: {
  record: SavedResumeRecord;
  isActive: boolean;
  onOpen: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-4 border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: isActive ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.07)",
        boxShadow: isActive ? "0 0 0 1px rgba(124,58,237,0.25)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1.5H3.5a1 1 0 00-1 1v11a1 1 0 001 1h9a1 1 0 001-1V5L9 1.5z" />
            <path d="M9 1.5V5h3.5" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate leading-snug">{record.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {record.template_name ?? "Custom"} · {record.language}
          </p>
        </div>

        {isActive && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            Editing
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-600 mb-3">
        Updated {formatRelative(record.updated_at)}
      </p>

      {/* ATS score if available */}
      {record.ats_score !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
            <span>ATS Score</span>
            <span style={{ color: record.ats_score >= 90 ? "#10b981" : record.ats_score >= 75 ? "#7c3aed" : "#f59e0b" }}>
              {record.ats_score}%
            </span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${record.ats_score}%`,
                background: record.ats_score >= 90 ? "#10b981" : record.ats_score >= 75 ? "#7c3aed" : "#f59e0b",
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex-1 min-w-[72px] py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          View
        </button>

        <button
          type="button"
          onClick={onOpen}
          disabled={isActive}
          className="flex-1 min-w-[72px] py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          {isActive ? "Currently editing" : "Edit"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="Delete resume"
          className="px-3 py-2 rounded-lg transition-all duration-200 hover:opacity-90"
          style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3.5h9M5.5 3.5V2.5h2v1M3.5 3.5l.5 7h5l.5-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
