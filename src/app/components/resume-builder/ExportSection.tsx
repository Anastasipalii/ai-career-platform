import { ResumeFormData } from "@/app/components/resume-builder/types";
import { SaveStatus, PdfStatus } from "@/app/components/resume-builder/ResumeBuilderClient";

interface ExportSectionProps {
  formData: ResumeFormData;
  onSave: () => void;
  onDownload: () => void;
  saveStatus: SaveStatus;
  pdfStatus: PdfStatus;
  isSaved: boolean;
}

// ── Save button ──────────────────────────────────────────────────────────────
function SaveButtonContent({ saveStatus, isSaved }: { saveStatus: SaveStatus; isSaved: boolean }) {
  if (saveStatus === "saving") {
    return (
      <>
        <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" />
          <path d="M7.5 1.5a6 6 0 016 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        Saving…
      </>
    );
  }
  if (saveStatus === "saved") {
    return (
      <>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Saved!
      </>
    );
  }
  if (saveStatus === "error") {
    return (
      <>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.5 4.5v3.5M7.5 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Failed — try again
      </>
    );
  }
  return (
    <>
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 2h8.5L13 4.5V13H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
      {isSaved ? "Update Resume" : "Save Resume"}
    </>
  );
}

function saveButtonStyle(saveStatus: SaveStatus): React.CSSProperties {
  if (saveStatus === "saved") {
    return { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" };
  }
  if (saveStatus === "error") {
    return { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" };
  }
  return { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExportSection({
  formData,
  onSave,
  onDownload,
  saveStatus,
  pdfStatus,
  isSaved,
}: ExportSectionProps) {
  const filename = formData.fullName
    ? `${formData.fullName.toLowerCase().replace(/\s+/g, "-")}-resume`
    : "my-resume";

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Export</p>

      <div className="flex flex-col gap-2.5">
        {/* Primary — Download PDF */}
        <button
          type="button"
          onClick={onDownload}
          disabled={pdfStatus === "generating"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: pdfStatus === "generating" ? "none" : "0 0 24px rgba(124,58,237,0.3)",
          }}
          title={pdfStatus === "generating" ? "Generating PDF…" : `Download ${filename}.pdf`}
        >
          {pdfStatus === "generating" ? (
            <>
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.75" />
                <path d="M7.5 1.5a6 6 0 016 6" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF
            </>
          )}
        </button>

        {/* Secondary — Save / Update */}
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          style={saveButtonStyle(saveStatus)}
        >
          <SaveButtonContent saveStatus={saveStatus} isSaved={isSaved} />
        </button>

        {/* Tertiary — Share (not yet available) */}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}
          title="Share links coming soon"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="11.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="3.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="11.5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M5 6.5l5-3M5 8.5l5 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Share Resume
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
          >
            Soon
          </span>
        </button>
      </div>
    </div>
  );
}
