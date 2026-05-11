"use client";

import { useState } from "react";
import DashboardSidebar from "@/app/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import QuickStats from "@/app/components/dashboard/QuickStats";
import RecentActivity from "@/app/components/dashboard/RecentActivity";
import QuickActions from "@/app/components/dashboard/QuickActions";
import SavedResumes from "@/app/components/dashboard/SavedResumes";
import SavedCoverLetters from "@/app/components/dashboard/SavedCoverLetters";
import JobMatchesWidget from "@/app/components/dashboard/JobMatchesWidget";
import RoadmapWidget from "@/app/components/dashboard/RoadmapWidget";
import InterviewWidget from "@/app/components/dashboard/InterviewWidget";

export default function DashboardClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "#05050a" }}>

      {/* ── Desktop sidebar (fixed) ── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 z-10 border-r"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(9,9,16,0.98)" }}
      >
        <DashboardSidebar activePath="/dashboard" />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-60 z-50 border-r"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(9,9,16,0.99)" }}
          >
            <DashboardSidebar
              activePath="/dashboard"
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main content (offset by sidebar on desktop) ── */}
      <div className="flex-1 lg:pl-60 min-w-0">
        <main className="px-4 sm:px-6 lg:px-8 py-7 max-w-[1400px]">

          {/* Header */}
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

          {/* Quick stats */}
          <QuickStats />

          {/* Row 1: Activity + Quick Actions */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 mb-5">
            <RecentActivity />
            <div className="flex flex-col gap-5">
              <QuickActions />
              <RoadmapWidget />
            </div>
          </div>

          {/* Saved resumes */}
          <div className="mb-5">
            <SavedResumes />
          </div>

          {/* Row 2: Job Matches + Interview */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-5">
            <JobMatchesWidget />
            <InterviewWidget />
          </div>

          {/* Saved cover letters */}
          <div className="mb-8">
            <SavedCoverLetters />
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-700 text-center pb-2">
            CareerAI · All data is mock · No backend connected yet
          </p>
        </main>
      </div>
    </div>
  );
}
