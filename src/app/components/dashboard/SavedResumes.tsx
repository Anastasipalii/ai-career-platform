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
        <a
          href="/resume-builder"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          Build a resume
        </a>
      </div>
    </div>
  );
}
