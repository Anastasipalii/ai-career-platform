import { ResumeFormData } from "@/app/components/resume-builder/types";

interface ExportSectionProps {
  formData: ResumeFormData;
}

export default function ExportSection({ formData }: ExportSectionProps) {
  const filename = formData.fullName
    ? `${formData.fullName.toLowerCase().replace(/\s+/g, "-")}-resume`
    : "my-resume";

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
        Export
      </p>
      <div className="flex flex-col gap-2.5">
        {/* Primary — Download PDF */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: "0 0 24px rgba(124,58,237,0.3)",
          }}
          title={`Download ${filename}.pdf`}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Download PDF
        </button>

        {/* Secondary — Save */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M2 2h8.5L13 4.5V13H2V2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect x="4" y="8.5" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
            <rect x="4.5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          Save Resume
        </button>

        {/* Tertiary — Share */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:border-white/20 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="11.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="3.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="11.5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M5 6.5l5-3M5 8.5l5 3"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
          Share Resume
        </button>
      </div>
    </div>
  );
}
