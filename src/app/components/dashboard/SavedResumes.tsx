interface Resume {
  id: number;
  title: string;
  language: string;
  lastUpdated: string;
  atsScore: number;
  status: "Active" | "Draft";
}

const resumes: Resume[] = [
  { id: 1, title: "Product Designer — Vercel", language: "English (US)", lastUpdated: "2 days ago", atsScore: 94, status: "Active" },
  { id: 2, title: "Senior UX Designer — Stripe", language: "English (US)", lastUpdated: "5 days ago", atsScore: 87, status: "Active" },
  { id: 3, title: "Head of Design Application", language: "German", lastUpdated: "1 week ago", atsScore: 91, status: "Draft" },
];

function AtsBar({ score }: { score: number }) {
  const color = score >= 90 ? "#10b981" : score >= 80 ? "#7c3aed" : "#f59e0b";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function SavedResumes() {
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
        <a
          href="/resume-builder"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          + New resume
        </a>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
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
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-white truncate">{resume.title}</p>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                  style={
                    resume.status === "Active"
                      ? { background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }
                      : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {resume.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span>{resume.language}</span>
                <span>·</span>
                <span>Updated {resume.lastUpdated}</span>
              </div>
              <div className="max-w-[200px]">
                <div className="text-[10px] text-slate-600 mb-1">ATS Score</div>
                <AtsBar score={resume.atsScore} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { label: "Edit", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)" },
                { label: "Download", color: "#06b6d4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.15)" },
                { label: "Duplicate", color: "#475569", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90"
                  style={{ background: btn.bg, color: btn.color, border: `1px solid ${btn.border}` }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
