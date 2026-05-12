"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { JobPreferencesData, JobMatch } from "@/app/components/job-match/types";
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

export default function JobMatchClient() {
  const router = useRouter();
  const [prefs, setPrefs]           = useState<JobPreferencesData>(INITIAL_PREFS);
  const [fileName, setFileName]     = useState<string | null>(null);
  const [matched, setMatched]       = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [aiJobs, setAiJobs]         = useState<JobMatch[]>([]);
  const [toast, setToast]           = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSearch = async () => {
    if (!prefs.jobTitle.trim()) {
      showToast("Please enter a target job title.", "error");
      return;
    }

    setIsSearching(true);
    setMatched(false);
    setAiJobs([]);

    try {
      const res = await fetch("/api/job-match/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(prefs),
      });

      const data = await res.json() as { jobs?: JobMatch[]; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Job match analysis failed.");
      }

      const jobs: JobMatch[] = (data.jobs ?? []).map((j, i) => ({ ...j, id: j.id ?? i + 1 }));
      setAiJobs(jobs);
      setMatched(true);

      // Save top results to Supabase (fire-and-forget)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        for (const job of jobs.slice(0, 3)) {
          await supabase.from("job_matches").insert({
            user_id:              session.user.id,
            job_title:            job.title,
            company_name:         job.company,
            match_score:          job.matchScore,
            missing_skills:       job.missingSkills,
            recommended_keywords: job.requiredSkills,
          });
        }
      }

      showToast(`Found ${jobs.length} matching roles!`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Job match failed. Please try again.",
        "error"
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <JobMatchHero />
      <div className="section-divider" />

      <section id="matcher" className="py-16 relative">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Job matcher
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <JobMatchUpload fileName={fileName} onFileChange={setFileName} />
              <JobPreferencesForm
                data={prefs}
                onChange={setPrefs}
                onSearch={handleSearch}
                isSearching={isSearching}
              />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <JobMatchResults
                matched={matched}
                isSearching={isSearching}
                onSearch={handleSearch}
                aiJobs={aiJobs}
              />
              <JobMatchActions hasResults={matched} />

              {matched && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Update preferences and click{" "}
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Find Matching Jobs
                  </button>{" "}
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
