// Pure, grounded preview. Renders ONLY the user's own supplied data (name,
// role, experience) and the CURRENT (edited) AI-generated headline/about/skills
// passed in as props. There is NO hardcoded sample/persona content — nothing
// fabricated can ever appear as the user's result. Absent fields render a
// neutral "not generated yet" state, never sample candidate facts.

interface LinkedInPreviewProps {
  name: string;
  role: string;
  experience: string;
  optimized: boolean;
  headline?: string;
  about?: string;
  skills?: string[];
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
  return (
    <div
      style={{
        width: "72px", height: "72px", borderRadius: "50%",
        background: "linear-gradient(135deg, #0a66c2, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", fontWeight: 700, color: "white",
        border: "3px solid white", flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{children}</span>
);

export default function LinkedInPreview({ name, role, experience, optimized, headline, about, skills }: LinkedInPreviewProps) {
  const displayName = name.trim() || "Your name";
  const expLines = experience.trim() ? experience.split("\n").filter(Boolean) : [];
  const skillList = skills ?? [];

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</p>
        {optimized && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            AI generated
          </div>
        )}
      </div>

      {/* LinkedIn-style document (visual format only; all content is user/AI data) */}
      <div style={{ background: "#f3f2ef", padding: "12px", maxHeight: "580px", overflowY: "auto" }}>
        <div style={{ background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif", position: "relative" }}>
          <div style={{ height: "80px", background: "linear-gradient(135deg, #0a66c2 0%, #7c3aed 100%)" }} />

          <div style={{ padding: "0 20px 16px", position: "relative" }}>
            <div style={{ marginTop: "-36px", marginBottom: "10px" }}>
              <Avatar name={name} />
            </div>

            <div style={{ fontSize: "20px", fontWeight: 700, color: "#000000e6", lineHeight: 1.2, marginBottom: "4px" }}>{displayName}</div>

            {/* Headline */}
            <div style={{ fontSize: "13px", color: "#000000cc", lineHeight: 1.5, marginBottom: "8px" }}>
              {headline?.trim() ? headline : <Muted>{optimized ? "No headline was generated." : "Your optimized headline will appear here."}</Muted>}
            </div>

            {role.trim() && (
              <div style={{ fontSize: "12px", color: "#00000099", marginBottom: "4px" }}>{role}</div>
            )}
          </div>

          <div style={{ height: "1px", background: "#e5e7eb", margin: "0 20px" }} />

          {/* About */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "8px" }}>About</div>
            <p style={{ fontSize: "12px", color: "#000000cc", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
              {about?.trim() ? about : <Muted>{optimized ? "No About section was generated." : "Your optimized About section will appear here."}</Muted>}
            </p>
          </div>

          <div style={{ height: "8px", background: "#f3f2ef" }} />

          {/* Experience — user's own supplied text only */}
          <div style={{ padding: "16px 20px", background: "#ffffff" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "10px" }}>Experience</div>
            {expLines.length ? (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
                {expLines.map((line, i) =>
                  line.startsWith("•") ? (
                    <div key={i} style={{ fontSize: "11.5px", color: "#000000b3", lineHeight: 1.6, paddingLeft: "10px" }}>{line}</div>
                  ) : (
                    <div key={i} style={{ fontSize: "12.5px", fontWeight: 600, color: "#000000e6" }}>{line}</div>
                  ),
                )}
              </div>
            ) : (
              <p style={{ fontSize: "12px", margin: 0 }}><Muted>Experience you enter in the form appears here — exactly as you wrote it.</Muted></p>
            )}
          </div>

          <div style={{ height: "8px", background: "#f3f2ef" }} />

          {/* Skills */}
          <div style={{ padding: "16px 20px", background: "#ffffff" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "10px" }}>Skills</div>
            {skillList.length ? (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                {skillList.map((skill) => (
                  <span key={skill} style={{ fontSize: "11px", background: "#f3f2ef", color: "#000000cc", padding: "4px 10px", borderRadius: "12px", fontWeight: 500, border: "1px solid #ddd" }}>{skill}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "12px", margin: 0 }}><Muted>{optimized ? "No confirmed skills were generated from your input." : "Skills you supply will appear here."}</Muted></p>
            )}
          </div>

          {/* Pre-optimize overlay — unmistakably not user output */}
          {!optimized && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(3px)", borderRadius: "8px" }}>
              <div style={{ textAlign: "center", padding: "24px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(10,102,194,0.12)", border: "1px solid rgba(10,102,194,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                    <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                  </svg>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Your optimized profile will appear here</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Fill in your details and click Optimize</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
