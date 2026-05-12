import { MOCK_JOBS, matchScoreColor, JobMatch } from "@/app/components/job-match/types";

const WORK_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Remote:    { bg: "rgba(16,185,129,0.1)",   color: "#10b981" },
  Hybrid:    { bg: "rgba(6,182,212,0.1)",    color: "#06b6d4" },
  "On-site": { bg: "rgba(245,158,11,0.1)",   color: "#f59e0b" },
};

function ScoreBadge({ score }: { score: number }) {
  const color = matchScoreColor(score);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl shrink-0"
      style={{
        width: "60px",
        height: "60px",
        background: `${color}15`,
        border: `1px solid ${color}44`,
      }}
    >
      <span className="text-lg font-bold leading-none" style={{ color }}>{score}</span>
      <span className="text-[9px] font-medium mt-0.5" style={{ color, opacity: 0.7 }}>match</span>
    </div>
  );
}

function JobCard({ job }: { job: JobMatch }) {
  const wt = WORK_TYPE_COLORS[job.workType] ?? WORK_TYPE_COLORS["On-site"];

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5"
      style={{ background: "rgba(13,13,22,0.5)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Top row */}
      <div className="flex items-start gap-4 mb-4">
        <ScoreBadge score={job.matchScore} />
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm leading-snug mb-0.5">{job.title}</h4>
          <p className="text-slate-400 text-xs mb-2">
            {job.company} · {job.location}
          </p>
          <div className="flex items-center flex-wrap gap-2">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: wt.bg, color: wt.color, border: `1px solid ${wt.color}44` }}
            >
              {job.workType}
            </span>
            <span className="text-[10px] text-slate-500">{job.employmentType}</span>
            <span className="text-[10px] font-semibold text-slate-300">{job.salaryRange}</span>
            <span className="text-[10px] text-slate-600 ml-auto">{job.postedDate}</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-4 space-y-2">
        {/* Matching skills */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[10px] text-emerald-500 font-medium shrink-0 mt-0.5">✓ Have:</span>
          {job.requiredSkills.map((s) => (
            <span
              key={s}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              {s}
            </span>
          ))}
        </div>
        {/* Missing skills */}
        {job.missingSkills.length > 0 && (
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[10px] text-amber-400 font-medium shrink-0 mt-0.5">△ Missing:</span>
            {job.missingSkills.map((s) => (
              <span
                key={s}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.25)",
          color: "#c4b5fd",
        }}
      >
        Improve Resume for This Job
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 6.5h9M7.5 3l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

interface JobMatchResultsProps {
  matched: boolean;
  isSearching: boolean;
  onSearch: () => void;
  aiJobs?: JobMatch[];
}

export default function JobMatchResults({ matched, isSearching, onSearch, aiJobs }: JobMatchResultsProps) {
  const jobs = aiJobs && aiJobs.length > 0 ? aiJobs : MOCK_JOBS;
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Match Results</p>
        <div className="flex items-center gap-3">
          {matched && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
              {jobs.length} matches found
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Content */}
      {matched ? (
        <div style={{ background: "#0d0d1a", padding: "12px", maxHeight: "580px", overflowY: "auto" }}>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{ background: "rgba(13,13,22,0.6)", padding: "40px 24px" }}
          className="flex flex-col items-center justify-center text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="9" />
              <path d="M18 18l6 6" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">Your matches will appear here</p>
          <p className="text-slate-500 text-xs mb-5 max-w-[260px]">
            Set your preferences and click Find Matching Jobs to see personalised results
          </p>
          <button
            type="button"
            onClick={onSearch}
            disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              boxShadow: "0 0 24px rgba(139,92,246,0.3)",
            }}
          >
            {isSearching ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
                </svg>
                Searching…
              </>
            ) : (
              <>Find Matching Jobs</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
