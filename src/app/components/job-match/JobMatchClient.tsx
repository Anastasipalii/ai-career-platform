"use client";

import { useState } from "react";
import { JobPreferencesData } from "@/app/components/job-match/types";
import JobMatchHero from "@/app/components/job-match/JobMatchHero";
import JobMatchUpload from "@/app/components/job-match/JobMatchUpload";
import JobPreferencesForm from "@/app/components/job-match/JobPreferencesForm";
import JobMatchResults from "@/app/components/job-match/JobMatchResults";
import JobMatchActions from "@/app/components/job-match/JobMatchActions";
import AIInsightsPanel from "@/app/components/job-match/AIInsightsPanel";
import SkillsGap from "@/app/components/job-match/SkillsGap";

const INITIAL_PREFS: JobPreferencesData = {
  jobTitle:       "Senior Product Designer",
  location:       "San Francisco, CA",
  workType:       "Remote",
  employmentType: "Full-time",
  salary:         "$140k – $180k",
  industry:       "Technology",
  seniority:      "Senior",
  language:       "English (US)",
};

export default function JobMatchClient() {
  const [prefs, setPrefs]       = useState<JobPreferencesData>(INITIAL_PREFS);
  const [fileName, setFileName] = useState<string | null>(null);
  const [matched, setMatched]   = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setMatched(false);
    setTimeout(() => {
      setIsSearching(false);
      setMatched(true);
    }, 2000);
  };

  return (
    <>
      <JobMatchHero />
      <div className="section-divider" />

      {/* ── Main matcher ── */}
      <section id="matcher" className="py-16 relative">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Job matcher
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — upload + preferences */}
            <div className="flex flex-col gap-5">
              <JobMatchUpload fileName={fileName} onFileChange={setFileName} />
              <JobPreferencesForm
                data={prefs}
                onChange={setPrefs}
                onSearch={handleSearch}
                isSearching={isSearching}
              />
            </div>

            {/* Right — sticky: results + actions */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <JobMatchResults
                matched={matched}
                isSearching={isSearching}
                onSearch={handleSearch}
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
      <div className="section-divider" />
      <SkillsGap />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop applying blindly, start matching smartly
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ job seekers using CareerAI to find roles where
            they are genuinely competitive.
          </p>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              boxShadow: "0 0 40px rgba(139,92,246,0.4)",
            }}
          >
            Find My Best Jobs
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
