import { RankedJob, matchScoreColor } from "@/app/components/job-match/types";
import { safeHref } from "@/lib/resume/urlSafety";

function ScoreBadge({ score }: { score: number }) {
  const color = matchScoreColor(score);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl shrink-0"
      style={{ width: "60px", height: "60px", background: `${color}15`, border: `1px solid ${color}44` }}
    >
      <span className="text-lg font-bold leading-none" style={{ color }}>{score}</span>
      <span className="text-[9px] font-medium mt-0.5" style={{ color, opacity: 0.7 }}>match</span>
    </div>
  );
}

function formatPosted(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function JobCard({ job, onSave, saved, saving }: { job: RankedJob; onSave: (job: RankedJob) => void; saved: boolean; saving: boolean }) {
  // Apply link uses ONLY a provider-supplied URL, validated to http(s). Never constructed.
  const apply = safeHref(job.applyUrl) ?? safeHref(job.sourceUrl);
  const posted = formatPosted(job.publishedAt);
  const locationLabel = [job.location?.trim() || "", job.remote ? "Remote" : ""].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5"
      style={{ background: "rgba(13,13,22,0.5)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-start gap-4 mb-3">
        {job.matchScore > 0 && <ScoreBadge score={job.matchScore} />}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm leading-snug mb-0.5">{job.title}</h4>
          <p className="text-slate-400 text-xs mb-2">
            {job.company}{locationLabel ? ` · ${locationLabel}` : ""}
          </p>
          <div className="flex items-center flex-wrap gap-2">
            {job.jobTypes.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                {t}
              </span>
            ))}
            <span className="text-[10px] text-slate-600 ml-auto">
              {job.provider}{posted ? ` · ${posted}` : ""}
            </span>
          </div>
        </div>
      </div>

      {job.whyMatch && (
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{job.whyMatch}</p>
      )}
      {job.description && (
        <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-3">{job.description}</p>
      )}

      {(job.recommendedSkills.length > 0 || job.missingSkills.length > 0) && (
        <div className="mb-4 space-y-2">
          {job.missingSkills.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] text-amber-400 font-medium shrink-0 mt-0.5">△ Could add:</span>
              {job.missingSkills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {job.recommendedSkills.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] text-emerald-500 font-medium shrink-0 mt-0.5">✦ Learn next:</span>
              {job.recommendedSkills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explicit Save (real provider job only) + provider-only apply link. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(job)}
          disabled={saving || saved}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-default"
          style={saved
            ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }
            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
        >
          {saved ? (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Saved
            </>
          ) : saving ? "Saving…" : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2h7.5L11 3.5V11H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
              Save
            </>
          )}
        </button>
        {apply ? (
          <a
            href={apply}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#c4b5fd" }}
          >
            View &amp; apply
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9L9 3M9 3H4.5M9 3v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        ) : (
          <span className="flex-1 text-[10px] text-slate-600 text-center py-2">No application link provided</span>
        )}
      </div>
    </div>
  );
}

interface JobMatchResultsProps {
  matched: boolean;
  isSearching: boolean;
  onSearch: () => void;
  jobs: RankedJob[];
  error?: string | null;
  onSave: (job: RankedJob) => void;
  savedKeys: Set<string>;
  savingKey: string | null;
}

export default function JobMatchResults({ matched, isSearching, onSearch, jobs, error, onSave, savedKeys, savingKey }: JobMatchResultsProps) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Match Results</p>
        <div className="flex items-center gap-3">
          {matched && !error && jobs.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
              {jobs.length} live {jobs.length === 1 ? "role" : "roles"}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {matched && error ? (
        // ── Provider / search failure — truthful, retryable. No fabricated jobs. ──
        <div style={{ background: "rgba(13,13,22,0.6)", padding: "40px 24px" }} className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16v.5" /></svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">Live job data unavailable</p>
          <p className="text-slate-500 text-xs mb-5 max-w-[280px]">{error}</p>
          <button type="button" onClick={onSearch} disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
            {isSearching ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : matched && jobs.length === 0 ? (
        // ── Zero real results — truthful. No mock/sample/AI fallback. ──
        <div style={{ background: "rgba(13,13,22,0.6)", padding: "40px 24px" }} className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">No live vacancies right now</p>
          <p className="text-slate-500 text-xs mb-5 max-w-[280px]">No real listings matched those preferences. Try a broader job title or a different location.</p>
          <button type="button" onClick={onSearch} disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
            {isSearching ? "Searching…" : "Search again"}
          </button>
        </div>
      ) : matched ? (
        <div style={{ background: "#0d0d1a", padding: "12px", maxHeight: "580px", overflowY: "auto" }}>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => { const k = `${job.provider}:${job.externalId}`; return <JobCard key={k} job={job} onSave={onSave} saved={savedKeys.has(k)} saving={savingKey === k} />; })}
          </div>
        </div>
      ) : (
        // ── Pre-search empty state ──
        <div style={{ background: "rgba(13,13,22,0.6)", padding: "40px 24px" }} className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="9" /><path d="M18 18l6 6" strokeWidth="2" /></svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">Your matches will appear here</p>
          <p className="text-slate-500 text-xs mb-5 max-w-[260px]">Set your preferences and click Find Matching Jobs to see real, live vacancies.</p>
          <button type="button" onClick={onSearch} disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", boxShadow: "0 0 24px rgba(139,92,246,0.3)" }}>
            {isSearching ? "Searching…" : "Find Matching Jobs"}
          </button>
        </div>
      )}
    </div>
  );
}
