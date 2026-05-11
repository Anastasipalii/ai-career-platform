import Link from "next/link";
import { CareerPathRow } from "@/app/components/dashboard/DashboardClient";

interface RoadmapWidgetProps {
  careerPath: CareerPathRow | null;
}

export default function RoadmapWidget({ careerPath }: RoadmapWidgetProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Career Roadmap</h2>
        <Link href="/career-path" className="text-xs text-pink-400 hover:text-pink-300 transition-colors font-medium">
          {careerPath ? "View full →" : "Create →"}
        </Link>
      </div>

      {!careerPath ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f9a8d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 13 5 8 9 11 13 5 17 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">No roadmap created yet</p>
          <p className="text-xs text-slate-600 mb-3">Map your path from where you are to where you want to be.</p>
          <Link
            href="/career-path"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "rgba(236,72,153,0.12)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.2)" }}
          >
            Create roadmap
          </Link>
        </div>
      ) : (
        <div className="p-5">
          {/* Role transition */}
          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="font-medium text-white truncate">{careerPath.current_role}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: "#ec4899" }}>
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium text-white truncate">{careerPath.target_role}</span>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Overall progress</span>
              <span className="font-semibold" style={{ color: "#ec4899" }}>{careerPath.progress}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${careerPath.progress}%`, background: "linear-gradient(90deg, #be185d, #ec4899)" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
