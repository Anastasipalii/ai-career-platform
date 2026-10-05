"use client";

// ============================================================================
// ResumeViewModal — read-only presentation of a SAVED résumé (Phase C Step 1.1).
//
// Reuses the ONE canonical renderer (ResumePreview). Opening it is purely
// read-only: it renders a snapshot passed in by the parent and never touches
// the builder's form data, the saved record, Supabase, AI, or analysis. The
// parent keeps its own state, so unsaved builder work is untouched while viewing.
// Accessible dialog: role/aria-modal, Escape + backdrop + button to close,
// focus moved into the dialog, background scroll locked while open.
// ============================================================================

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ResumeFormData, CustomizationSettings } from "@/app/components/resume-builder/types";
import ResumePreview from "@/app/components/resume-builder/ResumePreview";

interface ResumeViewModalProps {
  title: string;
  formData: ResumeFormData;
  settings: CustomizationSettings;
  onClose: () => void;
  onEdit: () => void;
}

export default function ResumeViewModal({ title, formData, settings, onClose, onEdit }: ResumeViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while open; restore on close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Move focus into the dialog for keyboard/screen-reader users.
  useEffect(() => { dialogRef.current?.focus(); }, []);

  if (typeof document === "undefined") return null;

  const node = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${title || "résumé"}`}
        tabIndex={-1}
        className="relative w-full max-w-3xl rounded-2xl border flex flex-col overflow-hidden outline-none"
        style={{
          background: "rgba(11,11,20,0.98)",
          borderColor: "rgba(255,255,255,0.09)",
          maxHeight: "92vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{title || "Résumé"}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Read-only preview · {settings.colorTheme} · {settings.layout}</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            Edit this résumé
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body — the saved résumé, rendered read-only by the canonical preview */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ResumePreview formData={formData} settings={settings} domId="resume-view-modal" />
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
