import { FeedbackData } from "@/app/components/interview-coach/types";

interface FeedbackPanelProps {
  data: FeedbackData;
  questionText: string;
}

const CIRCUMFERENCE = 2 * Math.PI * 24; // r=24

function ScoreGauge({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="24"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <circle
            cx="32" cy="32" r="24"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <text
            x="32" y="37"
            textAnchor="middle"
            fill="white"
            fontSize="13"
            fontWeight="700"
            fontFamily="inherit"
          >
            {score}
          </text>
        </svg>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function FeedbackPanel({ data, questionText }: FeedbackPanelProps) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(245,158,11,0.06)" }}
      >
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          AI Feedback
        </div>
        <p className="text-xs text-slate-500 ml-1 truncate">&ldquo;{questionText}&rdquo;</p>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Scores */}
        <div>
          <p className="text-xs text-slate-500 mb-4">Response scores</p>
          <div className="flex items-center justify-around">
            <ScoreGauge label="Clarity"     score={data.clarity}     color="#7c3aed" />
            <ScoreGauge label="Confidence"  score={data.confidence}  color="#f59e0b" />
            <ScoreGauge label="Structure"   score={data.structure}   color="#10b981" />
          </div>
        </div>

        {/* Improved answer */}
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2.5">
            Suggested improved answer
          </p>
          <div
            className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            &ldquo;{data.improvedAnswer}&rdquo;
          </div>
        </div>

        {/* Keywords */}
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2.5">
            Keywords to include
          </p>
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#6ee7b7",
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Mistakes */}
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2.5">
            Mistakes to avoid
          </p>
          <ul className="flex flex-col gap-2">
            {data.mistakes.map((m) => (
              <li key={m} className="flex items-start gap-2 text-xs text-slate-500">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="#f87171" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                </span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
