import {
  InterviewSetupData,
  SeniorityLevel,
  InterviewType,
  SENIORITY_LEVELS,
  INTERVIEW_TYPES,
  INTERVIEW_LANGUAGES,
  INDUSTRIES,
} from "@/app/components/interview-coach/types";

interface InterviewSetupProps {
  data: InterviewSetupData;
  onChange: (data: InterviewSetupData) => void;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const pillBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.5)",
};

const pillActive: React.CSSProperties = {
  background: "linear-gradient(135deg, #d97706, #7c3aed)",
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

export default function InterviewSetup({ data, onChange }: InterviewSetupProps) {
  const set = <K extends keyof InterviewSetupData>(key: K, value: InterviewSetupData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Target Role & Industry ── */}
      <Section title="Target Role" color="#f59e0b">
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
            <label className="block text-xs text-slate-500 mb-1.5">Industry</label>
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
        </div>
      </Section>

      {/* ── Seniority Level ── */}
      <Section title="Seniority Level" color="#7c3aed">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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

      {/* ── Interview Type ── */}
      <Section title="Interview Type" color="#06b6d4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {INTERVIEW_TYPES.map((type) => {
            const active = data.interviewType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set("interviewType", type as InterviewType)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={
                  active
                    ? { background: "rgba(6,182,212,0.1)", borderColor: "rgba(6,182,212,0.35)", color: "#67e8f9" }
                    : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }
                }
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: active ? "#06b6d4" : "rgba(255,255,255,0.2)" }}
                />
                {type}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Language ── */}
      <Section title="Interview Language" color="#10b981">
        <label className="block text-xs text-slate-500 mb-1.5">
          Questions and feedback will be delivered in this language
        </label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none cursor-pointer pr-9"}
            value={data.language}
            onChange={(e) => set("language", e.target.value as InterviewSetupData["language"])}
          >
            {INTERVIEW_LANGUAGES.map((lang) => (
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
    </div>
  );
}
