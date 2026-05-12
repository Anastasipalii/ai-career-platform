import {
  ResumeFormData,
  CustomizationSettings,
  ColorTheme,
  FontOption,
  SpacingOption,
} from "@/app/components/resume-builder/types";

interface ResumePreviewProps {
  formData: ResumeFormData;
  settings: CustomizationSettings;
  isRTL?: boolean;
}

/* ─── Theme lookup ─── */
interface ThemeColors {
  primary: string;
  accent: string;
  headerBg: string;
  headerText: string;
}

const THEME_COLORS: Record<ColorTheme, ThemeColors> = {
  "Purple Neon":   { primary: "#7c3aed", accent: "#a78bfa", headerBg: "#1e1b4b", headerText: "#ffffff" },
  "Navy Blue":     { primary: "#1e40af", accent: "#60a5fa", headerBg: "#1e3a5f", headerText: "#ffffff" },
  "Emerald Green": { primary: "#059669", accent: "#34d399", headerBg: "#064e3b", headerText: "#ffffff" },
  "Burgundy":      { primary: "#9f1239", accent: "#fb7185", headerBg: "#4c0519", headerText: "#ffffff" },
  "Black & White": { primary: "#111827", accent: "#6b7280", headerBg: "#111827", headerText: "#ffffff" },
  "Soft Beige":    { primary: "#92400e", accent: "#d97706", headerBg: "#fef3c7", headerText: "#1c1917" },
  "Minimal Gray":  { primary: "#374151", accent: "#9ca3af", headerBg: "#f3f4f6", headerText: "#111827" },
};

/* ─── Font lookup ─── */
const FONT_STACKS: Record<FontOption, string> = {
  Minimal:      "var(--font-geist-sans), system-ui, sans-serif",
  Professional: "Georgia, 'Times New Roman', serif",
  Creative:     "'Trebuchet MS', Optima, sans-serif",
  ModernSans:   "var(--font-geist-mono), 'Courier New', monospace",
  Elegant:      "Palatino, 'Palatino Linotype', serif",
};

/* ─── Spacing lookup ─── */
interface SpacingValues {
  sectionGap: string;
  itemGap: string;
  padding: string;
  fontSize: string;
}

const SPACING: Record<SpacingOption, SpacingValues> = {
  Compact:  { sectionGap: "12px", itemGap: "6px",  padding: "16px", fontSize: "10px" },
  Balanced: { sectionGap: "18px", itemGap: "10px", padding: "22px", fontSize: "11px" },
  Spacious: { sectionGap: "26px", itemGap: "14px", padding: "28px", fontSize: "12px" },
};

const or = (v: string, fallback: string) => v.trim() || fallback;

function SectionHeading({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color,
          paddingBottom: "4px",
          borderBottom: `1px solid ${color}44`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── Shared avatar ─── */
function Avatar({
  photoUrl,
  name,
  size,
  theme,
}: {
  photoUrl: string;
  name: string;
  size: number;
  theme: ThemeColors;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("");

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        overflow: "hidden",
        border: `2px solid ${theme.accent}66`,
        background: photoUrl ? "transparent" : `${theme.primary}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.round(size * 0.32)}px`,
        fontWeight: 700,
        color: theme.headerText,
        flexShrink: 0,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials || "?"
      )}
    </div>
  );
}

/* ─── Layout: One-column ─── */
function OneColumn({ formData, theme, sp, fs }: {
  formData: ResumeFormData;
  theme: ThemeColors;
  sp: SpacingValues;
  fs: string;
}) {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: theme.headerBg,
          padding: sp.padding,
          color: theme.headerText,
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        {(formData.photoUrl || formData.fullName) && (
          <Avatar photoUrl={formData.photoUrl} name={formData.fullName} size={48} theme={theme} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "3px" }}>
            {or(formData.fullName, "Your Name")}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "8px" }}>
            {or(formData.jobTitle, "Your Title")}
          </div>
          <div style={{ fontSize: "9px", opacity: 0.65, display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
            {formData.email    && <span>{formData.email}</span>}
            {formData.phone    && <span>{formData.phone}</span>}
            {formData.location && <span>{formData.location}</span>}
            {formData.linkedin && <span>{formData.linkedin}</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: sp.padding, color: "#111827", display: "flex", flexDirection: "column" as const, gap: sp.sectionGap }}>
        {formData.summary && (
          <div>
            <SectionHeading label="Summary" color={theme.primary} />
            <p style={{ fontSize: fs, color: "#374151", lineHeight: 1.6 }}>{formData.summary}</p>
          </div>
        )}

        {formData.experience.length > 0 && (
          <div>
            <SectionHeading label="Experience" color={theme.primary} />
            <div style={{ display: "flex", flexDirection: "column" as const, gap: sp.itemGap }}>
              {formData.experience.map((exp) => (
                <div key={exp.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: fs, color: "#111827" }}>{or(exp.role, "Role")}</span>
                      {exp.company && <span style={{ fontSize: fs, color: theme.primary }}> @ {exp.company}</span>}
                    </div>
                    <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "6px" }}>
                      {exp.startDate}{exp.startDate && exp.endDate ? " – " : ""}{exp.endDate}
                    </span>
                  </div>
                  <div style={{ marginTop: "3px" }}>
                    {exp.description.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.55 }}>· {line}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.education.length > 0 && (
          <div>
            <SectionHeading label="Education" color={theme.primary} />
            {formData.education.map((edu) => (
              <div key={edu.id} style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: fs, color: "#111827" }}>{or(edu.institution, "Institution")}</span>
                  <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "6px" }}>
                    {edu.startDate}{edu.startDate && edu.endDate ? " – " : ""}{edu.endDate}
                  </span>
                </div>
                <div style={{ fontSize: "9.5px", color: "#4b5563" }}>
                  {edu.degree}{edu.field ? `, ${edu.field}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {(formData.skills.length > 0 || formData.languages.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {formData.skills.length > 0 && (
              <div>
                <SectionHeading label="Skills" color={theme.primary} />
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
                  {formData.skills.map((s) => (
                    <span key={s} style={{ fontSize: "8.5px", background: `${theme.primary}18`, color: theme.primary, padding: "2px 6px", borderRadius: "4px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {formData.languages.length > 0 && (
              <div>
                <SectionHeading label="Languages" color={theme.primary} />
                {formData.languages.map((l) => (
                  <div key={l.id} style={{ fontSize: fs, color: "#374151" }}>
                    {l.language}{l.proficiency ? ` — ${l.proficiency}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Layout: Two-column ─── */
function TwoColumn({ formData, theme, sp, fs }: {
  formData: ResumeFormData;
  theme: ThemeColors;
  sp: SpacingValues;
  fs: string;
}) {
  return (
    <div>
      {/* Header */}
      <div style={{ background: theme.headerBg, padding: sp.padding, color: theme.headerText, display: "flex", alignItems: "center", gap: "12px" }}>
        {(formData.photoUrl || formData.fullName) && (
          <Avatar photoUrl={formData.photoUrl} name={formData.fullName} size={44} theme={theme} />
        )}
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "2px" }}>{or(formData.fullName, "Your Name")}</div>
          <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "5px" }}>{or(formData.jobTitle, "Your Title")}</div>
          <div style={{ fontSize: "9px", opacity: 0.65, display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
            {formData.email    && <span>{formData.email}</span>}
            {formData.phone    && <span>{formData.phone}</span>}
            {formData.location && <span>{formData.location}</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", padding: sp.padding, gap: "14px", color: "#111827" }}>
        {/* Left — main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: sp.sectionGap }}>
          {formData.summary && (
            <div>
              <SectionHeading label="Summary" color={theme.primary} />
              <p style={{ fontSize: fs, color: "#374151", lineHeight: 1.6 }}>{formData.summary}</p>
            </div>
          )}
          {formData.experience.length > 0 && (
            <div>
              <SectionHeading label="Experience" color={theme.primary} />
              {formData.experience.map((exp) => (
                <div key={exp.id} style={{ marginBottom: sp.itemGap }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: fs }}>{or(exp.role, "Role")}</span>
                      {exp.company && <span style={{ fontSize: fs, color: theme.primary }}> · {exp.company}</span>}
                    </div>
                    <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "8px" }}>
                      {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}
                    </span>
                  </div>
                  {exp.description.split("\n").filter(Boolean).map((line, i) => (
                    <div key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.5 }}>· {line}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — sidebar */}
        <div style={{ width: "35%", borderLeft: `1px solid ${theme.primary}22`, paddingLeft: "12px", display: "flex", flexDirection: "column" as const, gap: sp.sectionGap }}>
          {formData.skills.length > 0 && (
            <div>
              <SectionHeading label="Skills" color={theme.primary} />
              {formData.skills.map((s) => (
                <div key={s} style={{ fontSize: "9px", color: "#374151" }}>· {s}</div>
              ))}
            </div>
          )}
          {formData.education.length > 0 && (
            <div>
              <SectionHeading label="Education" color={theme.primary} />
              {formData.education.map((edu) => (
                <div key={edu.id} style={{ marginBottom: "4px" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 600, color: "#111827" }}>{or(edu.institution, "")}</div>
                  <div style={{ fontSize: "9px", color: "#6b7280" }}>{edu.degree}{edu.field ? `, ${edu.field}` : ""}</div>
                  <div style={{ fontSize: "9px", color: "#9ca3af" }}>{edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ""}</div>
                </div>
              ))}
            </div>
          )}
          {formData.languages.length > 0 && (
            <div>
              <SectionHeading label="Languages" color={theme.primary} />
              {formData.languages.map((l) => (
                <div key={l.id} style={{ fontSize: "9px", color: "#374151" }}>
                  <span style={{ fontWeight: 600 }}>{l.language}</span>{l.proficiency ? ` — ${l.proficiency}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Layout: Sidebar ─── */
function SidebarLayout({ formData, theme, sp, fs }: {
  formData: ResumeFormData;
  theme: ThemeColors;
  sp: SpacingValues;
  fs: string;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      {/* Sidebar */}
      <div style={{ width: "32%", background: theme.headerBg, color: theme.headerText, padding: sp.padding, display: "flex", flexDirection: "column" as const, gap: sp.sectionGap }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "8px", textAlign: "center" as const }}>
          <Avatar photoUrl={formData.photoUrl} name={formData.fullName} size={48} theme={theme} />
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, lineHeight: 1.2 }}>{or(formData.fullName, "Your Name")}</div>
            <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>{or(formData.jobTitle, "Title")}</div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.6, marginBottom: "6px" }}>Contact</div>
          {[formData.email, formData.phone, formData.location, formData.linkedin].filter(Boolean).map((v, i) => (
            <div key={i} style={{ fontSize: "9px", opacity: 0.75, marginBottom: "3px", wordBreak: "break-all" as const }}>{v}</div>
          ))}
        </div>

        {formData.skills.length > 0 && (
          <div>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.6, marginBottom: "6px" }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "3px" }}>
              {formData.skills.map((s) => (
                <span key={s} style={{ fontSize: "8px", background: "rgba(255,255,255,0.12)", padding: "2px 5px", borderRadius: "3px" }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {formData.languages.length > 0 && (
          <div>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.6, marginBottom: "6px" }}>Languages</div>
            {formData.languages.map((l) => (
              <div key={l.id} style={{ fontSize: "9px", opacity: 0.8, marginBottom: "2px" }}>
                {l.language}{l.proficiency ? ` — ${l.proficiency}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, background: "#ffffff", color: "#111827", padding: sp.padding, display: "flex", flexDirection: "column" as const, gap: sp.sectionGap }}>
        {formData.summary && (
          <div>
            <SectionHeading label="About" color={theme.primary} />
            <p style={{ fontSize: fs, color: "#374151", lineHeight: 1.6 }}>{formData.summary}</p>
          </div>
        )}
        {formData.experience.length > 0 && (
          <div>
            <SectionHeading label="Experience" color={theme.primary} />
            {formData.experience.map((exp) => (
              <div key={exp.id} style={{ marginBottom: sp.itemGap }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: fs }}>{or(exp.role, "Role")}</span>
                    {exp.company && <span style={{ fontSize: fs, color: theme.primary }}> · {exp.company}</span>}
                  </div>
                  <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "6px" }}>
                    {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}
                  </span>
                </div>
                {exp.description.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} style={{ fontSize: "9.5px", color: "#4b5563", lineHeight: 1.5 }}>· {line}</div>
                ))}
              </div>
            ))}
          </div>
        )}
        {formData.education.length > 0 && (
          <div>
            <SectionHeading label="Education" color={theme.primary} />
            {formData.education.map((edu) => (
              <div key={edu.id} style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: fs }}>{or(edu.institution, "Institution")}</span>
                  <span style={{ fontSize: "9px", color: "#9ca3af" }}>{edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ""}</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "#6b7280" }}>{edu.degree}{edu.field ? `, ${edu.field}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Layout: Modern Card ─── */
function ModernCard({ formData, theme, sp, fs }: {
  formData: ResumeFormData;
  theme: ThemeColors;
  sp: SpacingValues;
  fs: string;
}) {
  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "8px",
  };

  return (
    <div style={{ background: "#f9fafb" }}>
      {/* Accent bar */}
      <div style={{ height: "7px", background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />

      <div style={{ padding: sp.padding, display: "flex", flexDirection: "column" as const, gap: "8px" }}>
        {/* Name card */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "12px" }}>
          {(formData.photoUrl || formData.fullName) && (
            <Avatar photoUrl={formData.photoUrl} name={formData.fullName} size={40} theme={{ ...theme, headerBg: "#f3f4f6", headerText: "#111827" }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>{or(formData.fullName, "Your Name")}</div>
            <div style={{ fontSize: "11px", color: theme.primary, marginBottom: "4px" }}>{or(formData.jobTitle, "Your Title")}</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
              {[formData.email, formData.phone, formData.location].filter(Boolean).map((v, i) => (
                <span key={i} style={{ fontSize: "8.5px", color: "#6b7280" }}>{v}</span>
              ))}
            </div>
          </div>
        </div>

        {formData.skills.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: theme.primary, marginBottom: "6px" }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
              {formData.skills.map((s) => (
                <span key={s} style={{ fontSize: "8.5px", background: `${theme.primary}18`, color: theme.primary, padding: "2px 7px", borderRadius: "100px", fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {formData.summary && (
          <div style={cardStyle}>
            <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: theme.primary, marginBottom: "5px" }}>Summary</div>
            <p style={{ fontSize: fs, color: "#4b5563", lineHeight: 1.6 }}>{formData.summary}</p>
          </div>
        )}

        {formData.experience.length > 0 && (
          <div>
            <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: theme.primary, marginBottom: "5px" }}>Experience</div>
            {formData.experience.map((exp) => (
              <div key={exp.id} style={{ ...cardStyle, borderLeft: `3px solid ${theme.primary}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600, fontSize: fs, color: "#111827" }}>{or(exp.role, "Role")}</span>
                  <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "6px" }}>
                    {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}
                  </span>
                </div>
                {exp.company && <div style={{ fontSize: "9.5px", color: theme.primary, marginBottom: "3px", fontWeight: 500 }}>{exp.company}</div>}
                {exp.description.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} style={{ fontSize: "9px", color: "#6b7280", lineHeight: 1.5 }}>· {line}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {(formData.education.length > 0 || formData.languages.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: formData.languages.length > 0 ? "1fr 1fr" : "1fr", gap: "8px" }}>
            {formData.education.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: theme.primary, marginBottom: "5px" }}>Education</div>
                {formData.education.map((edu) => (
                  <div key={edu.id}>
                    <div style={{ fontWeight: 600, fontSize: "9.5px", color: "#111827" }}>{or(edu.institution, "Institution")}</div>
                    <div style={{ fontSize: "9px", color: "#6b7280" }}>{edu.degree}{edu.field ? `, ${edu.field}` : ""}</div>
                    <div style={{ fontSize: "9px", color: "#9ca3af" }}>{edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
            {formData.languages.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: theme.primary, marginBottom: "5px" }}>Languages</div>
                {formData.languages.map((l) => (
                  <div key={l.id} style={{ fontSize: "9.5px", color: "#374151", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 600 }}>{l.language}</span>{l.proficiency ? ` — ${l.proficiency}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ARABIC_FONT = "'Noto Sans Arabic', 'Arabic UI Text', 'Segoe UI', Arial, sans-serif";

/* ─── Main export ─── */
export default function ResumePreview({ formData, settings, isRTL = false }: ResumePreviewProps) {
  const theme = THEME_COLORS[settings.colorTheme];
  const sp = SPACING[settings.spacing];
  const fs = sp.fontSize;
  const sharedProps = { formData, theme, sp, fs };
  const fontFamily = isRTL ? ARABIC_FONT : FONT_STACKS[settings.font];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.8)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live preview</p>
        <div className="flex items-center gap-4">
          {isRTL && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              RTL
            </span>
          )}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: `${theme.primary}18`,
              border: `1px solid ${theme.primary}33`,
              color: theme.accent,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.primary }} />
            {settings.colorTheme}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Resume document */}
      <div style={{ background: "#e5e7eb", padding: "12px", maxHeight: "480px", overflowY: "auto" }}>
        <div
          id="resume-document"
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            background: "#ffffff",
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(0,0,0,0.14)",
            fontFamily,
            textAlign: isRTL ? "right" : "left",
            transition: "box-shadow 0.2s ease",
          }}
        >
          {settings.layout === "One-column"  && <OneColumn      {...sharedProps} />}
          {settings.layout === "Two-column"  && <TwoColumn      {...sharedProps} />}
          {settings.layout === "Sidebar"     && <SidebarLayout  {...sharedProps} />}
          {settings.layout === "Modern card" && <ModernCard     {...sharedProps} />}
        </div>
      </div>
    </div>
  );
}
