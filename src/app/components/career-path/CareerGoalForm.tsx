import {
  CareerGoalData,
  WorkStyle,
  ExperienceLevel,
  TimeGoal,
  WORK_STYLES,
  EXPERIENCE_LEVELS,
  TIME_GOALS,
  INDUSTRIES,
} from "@/app/components/career-path/types";

interface CareerGoalFormProps {
  data: CareerGoalData;
  onChange: (data: CareerGoalData) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const pillBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.5)",
};

const pillActive: React.CSSProperties = {
  background: "linear-gradient(135deg, #be185d, #ec4899)",
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

export default function CareerGoalForm({ data, onChange, onGenerate, isGenerating }: CareerGoalFormProps) {
  const set = <K extends keyof CareerGoalData>(key: K, value: CareerGoalData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Current & Target Role ── */}
      <Section title="Your Career Goals" color="#ec4899">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Current job title</label>
            <input
              className={inputCls}
              placeholder="Product Designer"
              value={data.currentTitle}
              onChange={(e) => set("currentTitle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Target job title</label>
            <input
              className={inputCls}
              placeholder="Head of Design"
              value={data.targetTitle}
              onChange={(e) => set("targetTitle", e.target.value)}
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
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Preferred country</label>
            <input
              className={inputCls}
              placeholder="United States, Germany, Remote…"
              value={data.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── Work Style ── */}
      <Section title="Work Style" color="#8b5cf6">
        <div className="grid grid-cols-3 gap-2.5">
          {WORK_STYLES.map((ws) => (
            <button
              key={ws}
              type="button"
              onClick={() => set("workStyle", ws as WorkStyle)}
              className="py-3 rounded-xl text-sm font-medium text-center transition-all duration-200 hover:opacity-90"
              style={data.workStyle === ws ? pillActive : pillBase}
            >
              {ws}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Experience Level ── */}
      <Section title="Experience Level" color="#06b6d4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {EXPERIENCE_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => set("experience", lvl as ExperienceLevel)}
              className="py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-200 hover:opacity-90"
              style={data.experience === lvl ? pillActive : pillBase}
            >
              {lvl}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Time Goal ── */}
      <Section title="Time Goal" color="#f59e0b">
        <p className="text-xs text-slate-500 mb-4">
          How long do you want to achieve your target role?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TIME_GOALS.map((tg) => {
            const active = data.timeGoal === tg;
            return (
              <button
                key={tg}
                type="button"
                onClick={() => set("timeGoal", tg as TimeGoal)}
                className="py-3.5 rounded-xl text-sm font-semibold text-center transition-all duration-200 hover:opacity-90 flex flex-col items-center gap-0.5"
                style={active ? pillActive : pillBase}
              >
                <span>{tg.split(" ")[0]}</span>
                <span className="text-[10px] font-normal opacity-70">months</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Generate button ── */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        style={{
          background: "linear-gradient(135deg, #be185d, #ec4899)",
          boxShadow: isGenerating ? "none" : "0 0 40px rgba(236,72,153,0.4)",
        }}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="26" strokeDashoffset="13" strokeLinecap="round" />
            </svg>
            Building your roadmap…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="white" fillOpacity="0.15" />
            </svg>
            Create My Roadmap
          </>
        )}
      </button>
    </div>
  );
}
