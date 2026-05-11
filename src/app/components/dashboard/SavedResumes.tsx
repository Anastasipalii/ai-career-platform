import Link from "next/link";
import { ResumeRow } from "@/app/components/dashboard/DashboardClient";

interface SavedResumesProps {
  resumes: ResumeRow[];
  formatRelative: (iso: string) => string;
}

function AtsBar({ score }: { score: number }) {
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#7c3aed" : "#f59e0b";
  return (
    <div className="flex items-center gap-2 max-w-[160px]">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function SavedResumes({ resumes, formatRelative }: SavedResumesProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Saved Resumes</h2>
        <Link
          href="/resume-builder"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          + New resume
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6l-4.5-4z" />
              <path d="M10.5 2V6H15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No resumes yet</p>
          <p className="text-xs text-slate-600 mb-3">Create your first AI-powered resume.</p>
          <Link
            href="/resume-builder"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            Build a resume
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1.5H3.5a1 1 0 00-1 1v11a1 1 0 001 1h9a1 1 0 001-1V5L9 1.5z" />
                  <path d="M9 1.5V5h3.5" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate mb-1">{resume.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>{resume.language}</span>
                  {resume.template_name && (
                    <>
                      <span>·</span>
                      <span>{resume.template_name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Updated {formatRelative(resume.updated_at)}</span>
                </div>
                {resume.ats_score !== null ? (
                  <>
                    <div className="text-[10px] text-slate-600 mb-1">ATS Score</div>
                    <AtsBar score={resume.ats_score} />
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600">ATS score not calculated</span>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0">
                <Link
                  href="/resume-builder"
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90"
                  style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
