"use client";

import { TranslationFormState } from "@/app/components/resume-translation/types";

interface TranslationExportProps {
  state: TranslationFormState;
  translated: boolean;
  saveStatus?: "idle" | "saving" | "saved";
  onSave?: () => void;
  /** CURRENT edited translated text. */
  translatedContent: string;
  canDelete?: boolean;
  onDelete?: () => void;
  confirmingDelete?: boolean;
  onRequestDelete?: () => void;
  onCancelDelete?: () => void;
  isDeleting?: boolean;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function TranslationExport({
  state, translated, saveStatus = "idle", onSave, translatedContent,
  canDelete, onDelete, confirmingDelete, onRequestDelete, onCancelDelete, isDeleting,
  showToast,
}: TranslationExportProps) {
  const hasContent = !!translatedContent.trim();

  const baseName = (state.fileName ? state.fileName.replace(/\.[^.]+$/, "") : "resume")
    + `-${state.targetLanguage.replace(/[^a-z]/gi, "-").toLowerCase()}`;

  // Copy the CURRENT edited translation; success ONLY after a resolved write.
  const handleCopy = async () => {
    if (!hasContent) { showToast("Nothing to copy yet.", "error"); return; }
    try {
      await navigator.clipboard.writeText(translatedContent);
      showToast("Translation copied to your clipboard.", "success");
    } catch {
      showToast("Couldn't access your clipboard. Select the text and copy it manually.", "error");
    }
  };

  // Real .txt download of the CURRENT edited translation (plain text — no PDF/DOCX/layout claim).
  const handleDownload = () => {
    if (!hasContent) { showToast("Nothing to download yet.", "error"); return; }
    try {
      const blob = new Blob([translatedContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast("Couldn't start the download. Please try again.", "error");
    }
  };

  const btnBase =
    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="rounded-2xl p-5 border" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Export</p>

      <div className="flex flex-col gap-2.5">
        {/* Download .txt */}
        <button
          type="button"
          disabled={!translated || !hasContent}
          onClick={handleDownload}
          title={`Download ${baseName}.txt`}
          className={btnBase + " text-white hover:opacity-90 hover:scale-[1.02] disabled:scale-100"}
          style={{ background: "linear-gradient(135deg, #059669, #7c3aed)", boxShadow: translated && hasContent ? "0 0 24px rgba(5,150,105,0.3)" : "none" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Download .txt
        </button>

        {/* Copy */}
        <button
          type="button"
          disabled={!translated || !hasContent}
          onClick={handleCopy}
          className={btnBase + " hover:border-white/20 hover:text-white"}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" /><path d="M10 5V3.5A1.5 1.5 0 008.5 2h-5A1.5 1.5 0 002 3.5v5A1.5 1.5 0 003.5 10H5" stroke="currentColor" strokeWidth="1.25" /></svg>
          Copy translated text
        </button>

        {/* Save */}
        <button
          type="button"
          disabled={!translated || !hasContent || saveStatus === "saving"}
          onClick={onSave}
          className={btnBase + " hover:border-white/20 hover:text-white"}
          style={{
            background: saveStatus === "saved" ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
            border:     saveStatus === "saved" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.07)",
            color:      saveStatus === "saved" ? "#6ee7b7" : "rgba(255,255,255,0.5)",
          }}
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved to your dashboard" : "Save translation"}
        </button>

        {/* Delete (only for a saved/reopened translation) */}
        {canDelete && (
          confirmingDelete ? (
            <div className="flex gap-2.5">
              <button type="button" onClick={onCancelDelete} className={btnBase} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
              <button type="button" onClick={onDelete} disabled={isDeleting} className={btnBase} style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>{isDeleting ? "Deleting…" : "Delete permanently"}</button>
            </div>
          ) : (
            <button type="button" onClick={onRequestDelete} className={btnBase} style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>Delete saved translation</button>
          )
        )}
      </div>

      {!translated && (
        <p className="text-xs text-slate-600 text-center mt-3">Translate your résumé first to enable export</p>
      )}
      <p className="text-[11px] text-slate-600 text-center mt-3">Downloads the translated text as a .txt file. CareerAI does not recreate the original PDF/DOCX layout.</p>
    </div>
  );
}
