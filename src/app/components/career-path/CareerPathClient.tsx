"use client";

import { useState } from "react";
import { CareerGoalData } from "@/app/components/career-path/types";
import CareerPathHero from "@/app/components/career-path/CareerPathHero";
import CareerPathUpload from "@/app/components/career-path/CareerPathUpload";
import CareerGoalForm from "@/app/components/career-path/CareerGoalForm";
import RoadmapPreview from "@/app/components/career-path/RoadmapPreview";
import CareerPathActions from "@/app/components/career-path/CareerPathActions";
import SkillsAnalysis from "@/app/components/career-path/SkillsAnalysis";
import CareerRoadmap from "@/app/components/career-path/CareerRoadmap";
import AIRecommendations from "@/app/components/career-path/AIRecommendations";

const INITIAL_GOAL: CareerGoalData = {
  currentTitle: "Senior Product Designer",
  targetTitle:  "Head of Design",
  industry:     "Technology",
  country:      "United States",
  workStyle:    "Remote",
  experience:   "Senior",
  timeGoal:     "12 months",
};

export default function CareerPathClient() {
  const [goalData, setGoalData]       = useState<CareerGoalData>(INITIAL_GOAL);
  const [fileName, setFileName]       = useState<string | null>(null);
  const [generated, setGenerated]     = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 2200);
  };

  return (
    <>
      <CareerPathHero />
      <div className="section-divider" />

      {/* ── Planner ── */}
      <section id="planner" className="py-16 relative">
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              Career planner
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            {/* Left — upload + form */}
            <div className="flex flex-col gap-5">
              <CareerPathUpload fileName={fileName} onFileChange={setFileName} />
              <CareerGoalForm
                data={goalData}
                onChange={setGoalData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>

            {/* Right — sticky preview + actions */}
            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <RoadmapPreview generated={generated} data={goalData} />
              <CareerPathActions hasRoadmap={generated} />

              {generated && (
                <p className="text-xs text-slate-600 text-center -mt-1">
                  Update your goals and click{" "}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-pink-400 hover:text-pink-300 transition-colors underline underline-offset-2"
                  >
                    Create Roadmap
                  </button>{" "}
                  again to refresh
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <SkillsAnalysis />
      <div className="section-divider" />
      <CareerRoadmap />
      <div className="section-divider" />
      <AIRecommendations />
      <div className="section-divider" />

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.06))" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop guessing your next move
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join 50,000+ professionals using CareerAI to build clear,
            achievable career roadmaps with real milestones.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #be185d, #ec4899)",
              boxShadow: "0 0 40px rgba(236,72,153,0.4)",
            }}
          >
            Create My Career Roadmap
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
