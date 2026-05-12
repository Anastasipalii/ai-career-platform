import {
  CareerGoalData,
  ExperienceLevel,
  TimeGoal,
  EXPERIENCE_LEVELS,
  TIME_GOALS,
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

export default function CareerGoalForm({ data, onChange, onGenerate, isGenerating }: CareerGoalFormProps) {
  const set = <K extends keyof CareerGoalData>(key: K, value: CareerGoalData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div
      className="rounded-2xl p-6 border flex flex-col gap-5"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Current & Target Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Current job title <span className="text-pink-400">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. Product Designer"
            value={data.currentTitle}
            onChange={(e) => set("currentTitle", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Target job title <span className="text-pink-400">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. Head of Design"
            value={data.targetTitle}
            onChange={(e) => set("targetTitle", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1.5">Preferred country</label>
          <input
            className={inputCls}
            placeholder="e.g. United States, Germany, or Remote"
            value={data.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-xs text-slate-500 mb-2">Experience level</label>
        <div className="grid grid-cols-3 gap-2">
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
      </div>

      {/* Time Goal */}
      <div>
        <label className="block text-xs text-slate-500 mb-2">Time to reach goal</label>
        <div className="grid grid-cols-3 gap-2.5">
          {TIME_GOALS.map((tg) => {
            const active = data.timeGoal === tg;
            return (
              <button
                key={tg}
                type="button"
                onClick={() => set("timeGoal", tg as TimeGoal)}
                className="py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 hover:opacity-90"
                style={active ? pillActive : pillBase}
              >
                {tg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
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
