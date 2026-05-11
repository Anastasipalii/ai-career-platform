import Link from "next/link";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <div
      className="flex items-start justify-between gap-4 mb-7 pb-6 border-b"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="mt-0.5 text-slate-500 hover:text-white transition-colors shrink-0 lg:hidden"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        </button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, Anastasiia&nbsp;👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your resumes, AI tools, and career progress in one place.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/resume-builder"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: "0 0 20px rgba(124,58,237,0.25)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New Resume
        </Link>
        <button
          type="button"
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polygon points="7 1 9 5 13 5.5 10 8.5 10.5 12.5 7 10.5 3.5 12.5 4 8.5 1 5.5 5 5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          </svg>
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}
