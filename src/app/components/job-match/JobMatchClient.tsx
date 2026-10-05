"use client";

import { useState, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { JobPreferencesData, RankedJob } from "@/app/components/job-match/types";
import type { NormalizedJob } from "@/lib/jobs/types";
import { safeHref } from "@/lib/resume/urlSafety";
import Toast from "@/app/components/ui/Toast";
import JobMatchHero from "@/app/components/job-match/JobMatchHero";
import JobMatchUpload from "@/app/components/job-match/JobMatchUpload";
import JobPreferencesForm from "@/app/components/job-match/JobPreferencesForm";
import JobMatchResults from "@/app/components/job-match/JobMatchResults";
import JobMatchActions from "@/app/components/job-match/JobMatchActions";
import AIInsightsPanel from "@/app/components/job-match/AIInsightsPanel";

const INITIAL_PREFS: JobPreferencesData = {
  jobTitle:       "",
  location:       "",
  workType:       "Remote",
  employmentType: "Full-time",
  seniority:      "Senior",
  language:       "English (US)",
};

interface AgentMatch {
  externalId?: string;
  matchScore: number;
  whyMatch?: string;
  missingSkills?: string[];
  recommendedSkills?: string[];
}

/** A saved job_matches row loaded for read-only review. */
interface SavedMatch {
  id: string;
  job_title: string;
  company_name: string | null;
  match_score: number | null;
  missing_skills: string[];
  recommended_keywords: string[];
  provider: string | null;
  provider_job_id: string | null;
  source_url: string | null;
  apply_url: string | null;
  created_at: string;
}

/** Strip provider HTML to a safe, bounded plain-text snippet. */
function snippet(html: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
}

const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

interface JobMatchClientProps {
  /** When present, open a SAVED match in read-only review (owner-scoped). */
  initialSavedId?: string;
}

export default function JobMatchClient({ initialSavedId }: JobMatchClientProps) {
  const router = useRouter();
  const [prefs, setPrefs]           = useState<JobPreferencesData>(INITIAL_PREFS);
  const [fileName, setFileName]     = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [matched, setMatched]       = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs]             = useState<RankedJob[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Explicit-save state, keyed by `${provider}:${externalId}`.
  const [savedKeys, setSavedKeys]   = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey]   = useState<string | null>(null);

  // Saved-match review state.
  const [review, setReview]         = useState<SavedMatch | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(!!initialSavedId);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Review: load a saved match read-only (owner-scoped, NO AI, no re-fetch) ──
  useEffect(() => {
    if (!initialSavedId) return;
    let cancelled = false;
    (async () => {
      setReviewLoading(true);
      setReviewError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("job_matches")
        .select("id, job_title, company_name, match_score, missing_skills, recommended_keywords, provider, provider_job_id, source_url, apply_url, created_at")
        .eq("id", initialSavedId)
        .eq("user_id", session.user.id) // defensive; RLS already restricts to owner
        .single();
      if (cancelled) return;
      if (error || !data) { setReviewError("Couldn't open that saved job."); setReviewLoading(false); return; }
      const r = data as Record<string, unknown>;
      setReview({
        id:              String(r.id),
        job_title:       typeof r.job_title === "string" ? r.job_title : "",
        company_name:    typeof r.company_name === "string" ? r.company_name : null,
        match_score:     typeof r.match_score === "number" ? r.match_score : null,
        missing_skills:  asStrArr(r.missing_skills),
        recommended_keywords: asStrArr(r.recommended_keywords),
        provider:        typeof r.provider === "string" ? r.provider : null,
        provider_job_id: typeof r.provider_job_id === "string" ? r.provider_job_id : null,
        source_url:      typeof r.source_url === "string" ? r.source_url : null,
        apply_url:       typeof r.apply_url === "string" ? r.apply_url : null,
        created_at:      typeof r.created_at === "string" ? r.created_at : "",
      });
      setReviewLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initialSavedId, router]);

  const handleResumeParsed = useCallback((text: string, name: string) => {
    setResumeText(text);
    setFileName(name);
    if (name) showToast("Résumé added — it will personalise ranking.", "success");
  }, [showToast]);

  const clearResume = useCallback(() => { setResumeText(""); setFileName(null); }, []);

  const handleSearch = async () => {
    if (!prefs.jobTitle.trim()) { showToast("Please enter a target job title.", "error"); return; }

    setIsSearching(true);
    setMatched(false);
    setSearchError(null);
    setJobs([]);

    try {
      const searchRes = await authedFetch("/api/jobs/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          query:         prefs.jobTitle,
          providerQuery: prefs.jobTitle,
          location:      prefs.location,
          remote:        prefs.workType === "Remote",
          limit:         20,
        }),
      });
      const searchData = await searchRes.json().catch(() => ({})) as {
        ok?: boolean; jobs?: NormalizedJob[]; error?: { message?: string };
      };

      if (!searchRes.ok || !searchData.ok) {
        setSearchError(searchData?.error?.message ?? "Live job data is currently unavailable. Please try again shortly.");
        setMatched(true);
        return;
      }

      const providerJobs = searchData.jobs ?? [];
      if (providerJobs.length === 0) {
        setJobs([]);
        setMatched(true);
        showToast("No live vacancies matched those preferences.", "success");
        return;
      }

      const byId = new Map(providerJobs.map((j) => [j.externalId, j]));

      let matches: AgentMatch[] = [];
      try {
        const agentRes = await authedFetch("/api/job-match/agent", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ jobs: providerJobs, resumeText: resumeText || undefined, targetRole: prefs.jobTitle }),
        });
        const agentData = await agentRes.json().catch(() => ({})) as { data?: { matches?: AgentMatch[] } };
        matches = agentData?.data?.matches ?? [];
      } catch {
        matches = [];
      }

      // Identity ALWAYS comes from the provider job (byId); the model only adds score/why/skills.
      const fromProvider = (j: NormalizedJob, score: number, why: string, missing: string[], rec: string[]): RankedJob => ({
        externalId: j.externalId, provider: j.provider, title: j.title, company: j.company,
        location: j.location, remote: j.remote, description: snippet(j.description), jobTypes: j.jobTypes,
        matchScore: Math.max(0, Math.min(100, Math.round(score))), whyMatch: why,
        missingSkills: missing, recommendedSkills: rec,
        applyUrl: j.applyUrl ?? "", sourceUrl: j.sourceUrl ?? "", publishedAt: j.publishedAt,
      });

      let ranked: RankedJob[];
      if (matches.length > 0) {
        ranked = matches
          .filter((m) => m.externalId && byId.has(m.externalId))
          .map((m) => {
            const j = byId.get(m.externalId!)!;
            return fromProvider(
              j, m.matchScore ?? 0, typeof m.whyMatch === "string" ? m.whyMatch : "",
              asStrArr(m.missingSkills), asStrArr(m.recommendedSkills)
            );
          });
      } else {
        ranked = providerJobs.map((j) => fromProvider(j, 0, "Live listing matched to your search.", [], []));
      }

      setJobs(ranked);
      setMatched(true);
      showToast(`Found ${ranked.length} live ${ranked.length === 1 ? "role" : "roles"}.`, "success");
    } catch {
      setSearchError("Something went wrong while searching. Please try again.");
      setMatched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Explicit save of ONE real provider job (never automatic). ────────────────
  const handleSaveJob = async (job: RankedJob) => {
    const key = `${job.provider}:${job.externalId}`;
    // Only a real provider job carries both identity fields.
    if (!job.provider || !job.externalId) { showToast("This job can't be saved.", "error"); return; }
    if (savedKeys.has(key)) { showToast("Already saved to your dashboard.", "success"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSavingKey(key);
    // Persist PROVIDER data as the source of truth (never AI-created identity).
    const { error } = await supabase.from("job_matches").insert({
      user_id:              session.user.id,
      job_title:            job.title,
      company_name:         job.company,
      match_score:          job.matchScore > 0 ? job.matchScore : null, // null, not a fake 0
      missing_skills:       job.missingSkills,
      recommended_keywords: job.recommendedSkills,
      provider:             job.provider,
      provider_job_id:      job.externalId,
      source_url:           job.sourceUrl || null,
      apply_url:            job.applyUrl || null,
    });
    setSavingKey(null);

    if (error) {
      // Unique-violation → the same provider job is already saved. Not an error.
      if ((error as { code?: string }).code === "23505") {
        setSavedKeys((s) => new Set(s).add(key));
        showToast("Already saved to your dashboard.", "success");
        return;
      }
      showToast("Couldn't save this job. Please try again.", "error");
      return;
    }
    setSavedKeys((s) => new Set(s).add(key));
    showToast("Job saved to your dashboard.", "success");
  };

  // ── Delete a saved match (owner-scoped, confirmed). ──────────────────────────
  const handleDeleteSaved = async () => {
    if (!review) return;
    setIsDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { error } = await supabase
      .from("job_matches")
      .delete()
      .eq("id", review.id)
      .eq("user_id", session.user.id);
    setIsDeleting(false);
    if (error) { showToast("Couldn't delete this saved job.", "error"); return; }
    showToast("Saved job deleted.", "success");
    router.push("/dashboard");
  };

  const keywords = Array.from(
    new Set(jobs.flatMap((j) => [...j.recommendedSkills, ...j.missingSkills]).map((s) => s.trim()).filter(Boolean))
  );
  const hasResults = matched && jobs.length > 0 && !searchError;

  // ── Saved-match review surface (read-only; replaces the search UI) ───────────
  if (initialSavedId) {
    const verified = !!(review && review.provider && review.provider_job_id);
    const apply = review ? (safeHref(review.apply_url ?? "") ?? safeHref(review.source_url ?? "")) : null;
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <JobMatchHero />
        <div className="section-divider" />
        <section className="py-16 relative">
          <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="section-divider flex-1" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">Saved job</span>
              <div className="section-divider flex-1" />
            </div>

            {reviewLoading ? (
              <p className="text-sm text-slate-400 text-center py-16">Loading your saved job…</p>
            ) : reviewError || !review ? (
              <div className="rounded-2xl border p-6 text-center" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(239,68,68,0.18)" }}>
                <p className="text-sm text-rose-300">{reviewError ?? "Saved job not found."}</p>
                <button type="button" onClick={() => router.push("/job-match")} className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">Back to Job Match</button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border p-6" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-white">{review.job_title || "Saved job"}</h2>
                      {review.company_name && <p className="text-xs text-slate-400 mt-0.5">{review.company_name}</p>}
                    </div>
                    {review.match_score !== null && (
                      <div className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5 shrink-0" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
                        <span className="text-base font-bold leading-none" style={{ color: "#c4b5fd" }}>{review.match_score}</span>
                        <span className="text-[9px] font-medium mt-0.5" style={{ color: "#c4b5fd", opacity: 0.7 }}>match</span>
                      </div>
                    )}
                  </div>

                  {/* Provenance: only provider-verified rows show the provider; legacy rows are clearly unverified. */}
                  {verified ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
                      Live listing · {review.provider}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" }}>
                      Unverified saved record · provider not stored
                    </span>
                  )}

                  {(review.missing_skills.length > 0 || review.recommended_keywords.length > 0) && (
                    <div className="mt-4 space-y-2">
                      {review.missing_skills.length > 0 && (
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-[10px] text-amber-400 font-medium shrink-0 mt-0.5">△ Could add:</span>
                          {review.missing_skills.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}>{s}</span>)}
                        </div>
                      )}
                      {review.recommended_keywords.length > 0 && (
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-[10px] text-emerald-500 font-medium shrink-0 mt-0.5">✦ Keywords:</span>
                          {review.recommended_keywords.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>{s}</span>)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Apply uses ONLY the stored provider URL, validated. Legacy rows (no safe URL) get none. */}
                  {verified && apply ? (
                    <a href={apply} target="_blank" rel="noopener noreferrer" className="mt-5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                      View &amp; apply
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9L9 3M9 3H4.5M9 3v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </a>
                  ) : (
                    <p className="mt-5 text-[10px] text-slate-600 text-center">No live application link is stored for this saved record.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {confirmDelete ? (
                    <>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:border-white/20 hover:text-white"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
                      <button type="button" onClick={handleDeleteSaved} disabled={isDeleting} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>{isDeleting ? "Deleting…" : "Delete permanently"}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => router.push("/job-match")} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>Find more jobs</button>
                      <button type="button" onClick={() => setConfirmDelete(true)} className="py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <JobMatchHero />
      <div className="section-divider" />

      <section id="matcher" className="py-16 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">Job matcher</span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <JobMatchUpload fileName={fileName} onParsed={handleResumeParsed} onClear={clearResume} onError={(m) => showToast(m, "error")} />
              <JobPreferencesForm data={prefs} onChange={setPrefs} onSearch={handleSearch} isSearching={isSearching} />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <JobMatchResults
                matched={matched}
                isSearching={isSearching}
                onSearch={handleSearch}
                jobs={jobs}
                error={searchError}
                onSave={handleSaveJob}
                savedKeys={savedKeys}
                savingKey={savingKey}
              />
              <JobMatchActions hasResults={hasResults} keywords={keywords} onToast={showToast} />

              {hasResults && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Update preferences and click{" "}
                  <button type="button" onClick={handleSearch} className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2">Find Matching Jobs</button>{" "}
                  to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <AIInsightsPanel />
    </>
  );
}
