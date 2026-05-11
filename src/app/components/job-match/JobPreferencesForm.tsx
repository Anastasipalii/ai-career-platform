import {
  JobPreferencesData,
  WorkType,
  EmploymentType,
  SeniorityLevel,
  WORK_TYPES,
  EMPLOYMENT_TYPES,
  SENIORITY_LEVELS,
  INDUSTRIES,
  LANGUAGES,
} from "@/app/components/job-match/types";

interface JobPreferencesFormProps {
  data: JobPreferencesData;
  onChange: (data: JobPreferencesData) => void;
  onSearch: () => void;
  isSearching: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const pillBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.5)",
};

const pillActive: React.CSSProperties = {
  background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
  border: "1px solid transparent",
  color: "white",
};

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function JobPreferencesForm({
  data,
  onChange,
  onSearch,
  isSearching,
}: JobPreferencesFormProps) {
  const set = <K extends keyof JobPreferencesData>(key: K, value: JobPreferencesData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Target Role & Location ── */}
      <Section title="Target Role" color="#8b5cf6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Job title</label>
            <input
              className={inputCls}
              placeholder="Senior Product Designer"
              value={data.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Preferred location</label>
            <input
              className={inputCls}
              placeholder="San Francisco, CA or Remote"
              value={data.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Preferred industry</label>
            <div className="relative">
              <select
                className={inputCls + " appearance-none cursor-pointer pr-9"}
                value={data.industry}
                onChange={(e) => set("industry", e.target.value)}
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Salary expectation</label>
            <input
              className={inputCls}
              placeholder="e.g. $120k – $160k"
              value={data.salary}
              onChange={(e) => set("salary", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── Work Type ── */}
      <Section title="Work Type" color="#06b6d4">
        <div className="grid grid-cols-3 gap-2.5">
          {WORK_TYPES.map((wt) => (
            <button
              key={wt}
              type="button"
              onClick={() => set("workType", wt as WorkType)}
              className="py-3 rounded-xl text-sm font-medium text-center transition-all duration-200 hover:opacity-90"
              style={data.workType === wt ? pillActive : pillBase}
            >
              {wt}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Employment Type ── */}
      <Section title="Employment Type" color="#10b981">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {EMPLOYMENT_TYPES.map((et) => (
            <button
              key={et}
              type="button"
              onClick={() => set("employmentType", et as EmploymentType)}
              className="py-3 rounded-xl text-xs font-medium text-center transition-all duration-200 hover:opacity-90"
              style={data.employmentType === et ? pillActive : pillBase}
            >
              {et}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Seniority Level ── */}
      <Section title="Seniority Level" color="#f59e0b">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SENIORITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => set("seniority", level as SeniorityLevel)}
              className="py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-200 hover:opacity-90"
              style={data.seniority === level ? pillActive : pillBase}
            >
              {level}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Language ── */}
      <Section title="Results Language" color="#ec4899">
        <label className="block text-xs text-slate-500 mb-1.5">
          Job descriptions and AI insights will be shown in this language
        </label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none cursor-pointer pr-9"}
            value={data.language}
            onChange={(e) => set("language", e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </Section>

      {/* ── Search button ── */}
      <button
        type="button"
        onClick={onSearch}
        disabled={isSearching}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
          boxShadow: isSearching ? "none" : "0 0 40px rgba(139,92,246,0.4)",
        }}
      >
        {isSearching ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Scanning job listings…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            Find Matching Jobs
          </>
        )}
      </button>
    </div>
  );
}
