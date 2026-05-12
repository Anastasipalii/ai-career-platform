import { CoverLetterFormData, ToneOption } from "@/app/components/cover-letter/types";

interface CoverLetterPreviewProps {
  formData: CoverLetterFormData;
  generated: boolean;
  aiContent?: string;
}

/* ─── Mock letter content keyed by tone ─── */
const TONE_OPENERS: Record<ToneOption, string> = {
  Professional: "I am writing to express my strong interest in this opportunity.",
  Friendly:     "I was genuinely excited to come across this opening and would love to be considered.",
  Confident:    "With a proven track record of delivering impact, I am applying for this role with confidence.",
};

const TONE_CLOSERS: Record<ToneOption, string> = {
  Professional: "I would welcome the opportunity to discuss how my background aligns with your team's goals.",
  Friendly:     "I would love to connect and explore how I can contribute to your team.",
  Confident:    "I am confident this role is the right next step and look forward to demonstrating that in person.",
};

function buildLetter(data: CoverLetterFormData): string[] {
  const opener = TONE_OPENERS[data.tone];
  const closer = TONE_CLOSERS[data.tone];

  return [
    `${opener} Having spent the last several years building impactful products at scale, I believe this position is a natural next step for my career.`,

    `My background combines strategic thinking with hands-on execution. I have led cross-functional projects, driven measurable improvements in key metrics, and built systems that scale. The skills I have developed are directly relevant to what this role requires.`,

    `What draws me to this opportunity is the combination of meaningful work and a team that clearly values craft. I thrive in environments where design, engineering, and product move together — and where the work has real impact on real people.`,

    `${closer}`,
  ];
}

/* ─── Tone accent colors ─── */
const TONE_ACCENT: Record<ToneOption, string> = {
  Professional: "#7c3aed",
  Friendly:     "#06b6d4",
  Confident:    "#f59e0b",
};

export default function CoverLetterPreview({ formData, generated, aiContent }: CoverLetterPreviewProps) {
  const paragraphs = aiContent
    ? aiContent.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : buildLetter(formData);
  const accent  = TONE_ACCENT[formData.tone];
  const today   = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const name    = formData.fullName || "Your Name";
  const company = formData.company  || "Hiring Manager";
  const role    = formData.jobTitle || "the role";

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Live preview
        </p>
        <div className="flex items-center gap-3">
          {generated && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              AI generated
            </div>
          )}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
            {formData.tone}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Document area */}
      <div style={{ background: "#e5e7eb", padding: "12px", maxHeight: "600px", overflowY: "auto" }}>
        <div
          id="cover-letter-document"
          style={{
            background: "#ffffff",
            borderRadius: "6px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.14)",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            padding: "40px 44px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
            }}
          />

          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
              {name}
            </div>
            <div style={{ fontSize: "13px", color: accent, fontWeight: 500, marginBottom: "10px" }}>
              {role}
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>alex.chen@email.com</span>
              <span>+1 (415) 555-0182</span>
              <span>San Francisco, CA</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: `${accent}33`, marginBottom: "24px" }} />

          {/* Date + recipient */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>{today}</div>
            <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>Hiring Manager</div>
              <div>{company}</div>
            </div>
          </div>

          {/* Subject line */}
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "18px" }}>
            Re: Application for {role} — {company}
          </div>

          {/* Salutation */}
          <div style={{ fontSize: "13px", color: "#374151", marginBottom: "14px" }}>
            Dear Hiring Team,
          </div>

          {/* Body paragraphs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            {paragraphs.map((para, i) => (
              <p
                key={i}
                style={{ fontSize: "13px", color: "#374151", lineHeight: 1.75, margin: 0 }}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Closing */}
          <div style={{ fontSize: "13px", color: "#374151" }}>
            <div style={{ marginBottom: "24px" }}>Warm regards,</div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>{name}</div>
            <div style={{ fontSize: "12px", color: accent, marginTop: "2px" }}>{role}</div>
          </div>

          {/* Watermark when not generated */}
          {!generated && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(2px)",
                borderRadius: "6px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `${accent}18`,
                    border: `1px solid ${accent}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2l2.5 6H20l-5 4 2 6-6-4-6 4 2-6-5-4h6.5z" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                  Your cover letter will appear here
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                  Fill in your details and click Generate
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
