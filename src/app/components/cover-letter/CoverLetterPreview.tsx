import { CoverLetterFormData, ToneOption } from "@/app/components/cover-letter/types";

interface CoverLetterPreviewProps {
  formData: CoverLetterFormData;
  generated: boolean;
  aiContent?: string;
}

/* ─── Neutral pre-generation skeleton (shown under a watermark, never exported
 *     or saved). Contains no candidate facts — just structure. ─── */
const TONE_SKELETON: Record<ToneOption, string[]> = {
  Professional: [
    "Your tailored opening paragraph will appear here, expressing interest in this specific role.",
    "A paragraph connecting your real experience and skills to what the job needs.",
    "A paragraph on why this company and role are a strong fit.",
    "A confident closing paragraph.",
  ],
  Friendly: [
    "Your warm opening paragraph will appear here, expressing interest in this specific role.",
    "A paragraph connecting your real experience and skills to what the job needs.",
    "A paragraph on why this company and role are a strong fit.",
    "A friendly, confident closing paragraph.",
  ],
  Confident: [
    "Your bold opening paragraph will appear here, expressing interest in this specific role.",
    "A paragraph connecting your real experience and skills to what the job needs.",
    "A paragraph on why this company and role are a strong fit.",
    "A confident, direct closing paragraph.",
  ],
};

/* ─── Tone accent colors ─── */
const TONE_ACCENT: Record<ToneOption, string> = {
  Professional: "#7c3aed",
  Friendly:     "#06b6d4",
  Confident:    "#f59e0b",
};

export default function CoverLetterPreview({ formData, generated, aiContent }: CoverLetterPreviewProps) {
  const paragraphs = aiContent
    ? aiContent.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    : TONE_SKELETON[formData.tone];
  const accent = TONE_ACCENT[formData.tone];
  const today  = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Real, user-provided values only — nothing is fabricated. Each line is
  // omitted entirely when the corresponding field is blank.
  const name     = formData.fullName.trim();
  const role     = formData.jobTitle.trim();
  const company  = formData.company.trim();
  const contacts = [formData.email.trim(), formData.phone.trim(), formData.location.trim()].filter(Boolean);
  const subjectParts = ["Re: Application", role && `for ${role}`, company && `— ${company}`].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live preview</p>
        <div className="flex items-center gap-3">
          {generated && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              AI generated
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}>
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
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

          {/* Header — real identity only; lines omitted when blank */}
          {(name || role || contacts.length > 0) && (
            <div style={{ marginBottom: "28px" }}>
              {name && (
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>{name}</div>
              )}
              {role && (
                <div style={{ fontSize: "13px", color: accent, fontWeight: 500, marginBottom: "10px" }}>{role}</div>
              )}
              {contacts.length > 0 && (
                <div style={{ fontSize: "11px", color: "#6b7280", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {contacts.map((c, i) => <span key={i}>{c}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: "1px", background: `${accent}33`, marginBottom: "24px" }} />

          {/* Date + recipient */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>{today}</div>
            <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>Hiring Team</div>
              {company && <div>{company}</div>}
            </div>
          </div>

          {/* Subject line */}
          {subjectParts && (
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "18px" }}>{subjectParts}</div>
          )}

          {/* Salutation */}
          <div style={{ fontSize: "13px", color: "#374151", marginBottom: "14px" }}>Dear Hiring Team,</div>

          {/* Body paragraphs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            {paragraphs.map((para, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#374151", lineHeight: 1.75, margin: 0 }}>{para}</p>
            ))}
          </div>

          {/* Closing — show name only when provided */}
          <div style={{ fontSize: "13px", color: "#374151" }}>
            <div style={{ marginBottom: name ? "24px" : "0" }}>Sincerely,</div>
            {name && <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>{name}</div>}
            {name && role && <div style={{ fontSize: "12px", color: accent, marginTop: "2px" }}>{role}</div>}
          </div>

          {/* Watermark when not generated */}
          {!generated && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.65)", backdropFilter: "blur(2px)", borderRadius: "6px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `${accent}18`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2l2.5 6H20l-5 4 2 6-6-4-6 4 2-6-5-4h6.5z" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Your cover letter will appear here</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Add your details and a job description, then click Generate</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
