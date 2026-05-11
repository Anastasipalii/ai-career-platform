import { TranslationFormState } from "@/app/components/resume-translation/types";

interface TranslationPreviewProps {
  state: TranslationFormState;
  translated: boolean;
}

/* ─── Realistic mock resume data ─── */
const ORIGINAL = {
  name: "Alexandra Chen",
  title: "Senior Product Designer",
  contact: "alex.chen@email.com  ·  +1 (415) 555-0182  ·  San Francisco, CA",
  summary:
    "Senior Product Designer with 6+ years of experience building AI-powered digital products at scale. Led design systems and zero-to-one products at Vercel and Linear, driving measurable improvements in user onboarding and engagement.",
  experience: [
    {
      role: "Senior Product Designer",
      company: "Vercel",
      period: "Mar 2022 – Present",
      bullets: [
        "Led redesign of developer dashboard, improving onboarding by 40%",
        "Built design system used across 12 product surfaces",
        "Drove 34% increase in deployment success rate through UX improvements",
      ],
    },
    {
      role: "Product Designer",
      company: "Linear",
      period: "Jun 2020 – Feb 2022",
      bullets: [
        "Designed core issue tracking and project management workflows",
        "Reduced onboarding time by 40% through progressive disclosure redesign",
        "Collaborated with engineering on React component library",
      ],
    },
  ],
  education: "Bachelor of Arts, Cognitive Science & HCI — UC Berkeley, 2016–2020",
  skills: ["Figma", "UX Research", "Design Systems", "Prototyping", "React", "A/B Testing"],
};

/* ─── Translated content per target language ─── */
const TRANSLATED_SUMMARIES: Partial<Record<string, string>> = {
  "German":
    "Erfahrene Senior Product Designerin mit über 6 Jahren Berufserfahrung in der Entwicklung KI-gestützter digitaler Produkte. Aufbau von Design-Systemen und Zero-to-One-Produkten bei Vercel und Linear mit messbaren Verbesserungen im Nutzer-Onboarding.",
  "Spanish":
    "Diseñadora de producto senior con más de 6 años de experiencia creando productos digitales impulsados por IA a gran escala. Lideré sistemas de diseño y productos de cero a uno en Vercel y Linear.",
  "French":
    "Designeuse produit senior avec plus de 6 ans d'expérience dans la création de produits numériques propulsés par l'IA. J'ai dirigé des systèmes de design et des produits de zéro à un chez Vercel et Linear.",
  "Ukrainian":
    "Старший дизайнер продукту з понад 6-річним досвідом створення цифрових продуктів на базі штучного інтелекту. Керувала системами дизайну та продуктами від нуля до одиниці у Vercel та Linear.",
  "Japanese":
    "AIを活用したデジタル製品の開発において6年以上の経験を持つシニアプロダクトデザイナー。VercelとLinearでデザインシステムとゼロイチプロダクトをリードし、ユーザーオンボーディングを大幅に改善。",
  "Chinese":
    "拥有6年以上经验的高级产品设计师，专注于构建AI驱动的数字产品。曾在Vercel和Linear主导设计系统建设，显著提升用户引导效率。",
};

const TRANSLATED_ROLES: Partial<Record<string, [string, string]>> = {
  "German":    ["Senior Product Designerin", "Product Designerin"],
  "Spanish":   ["Diseñadora de Producto Senior", "Diseñadora de Producto"],
  "French":    ["Designer Produit Senior", "Designer Produit"],
  "Ukrainian": ["Старший дизайнер продукту", "Дизайнер продукту"],
  "Japanese":  ["シニアプロダクトデザイナー", "プロダクトデザイナー"],
  "Chinese":   ["高级产品设计师", "产品设计师"],
};

function ResumeCard({
  label,
  accentColor,
  name,
  title,
  contact,
  summary,
  experience,
  education,
  skills,
  dimmed,
}: {
  label: string;
  accentColor: string;
  name: string;
  title: string;
  contact: string;
  summary: string;
  experience: typeof ORIGINAL.experience;
  education: string;
  skills: string[];
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden flex-1"
        style={{ boxShadow: `0 2px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)` }}
      >
        <div
          style={{
            background: "#ffffff",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            opacity: dimmed ? 0.45 : 1,
            transition: "opacity 0.3s ease",
            maxHeight: "520px",
            overflowY: "auto",
          }}
        >
          {/* Accent bar */}
          <div style={{ height: "5px", background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>{name}</div>
            <div style={{ fontSize: "12px", color: accentColor, fontWeight: 600, marginBottom: "6px" }}>{title}</div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{contact}</div>
          </div>

          <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column" as const, gap: "14px" }}>
            {/* Summary */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "5px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                Summary
              </div>
              <p style={{ fontSize: "10.5px", color: "#374151", lineHeight: 1.65 }}>{summary}</p>
            </div>

            {/* Experience */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "8px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                Experience
              </div>
              {experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#111827" }}>{exp.role}</span>
                      <span style={{ fontSize: "10.5px", color: accentColor }}> · {exp.company}</span>
                    </div>
                    <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "8px" }}>{exp.period}</span>
                  </div>
                  {exp.bullets.map((b, j) => (
                    <div key={j} style={{ fontSize: "10px", color: "#4b5563", lineHeight: 1.55 }}>· {b}</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Education */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "5px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                Education
              </div>
              <p style={{ fontSize: "10.5px", color: "#374151" }}>{education}</p>
            </div>

            {/* Skills */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "6px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                Skills
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
                {skills.map((s) => (
                  <span key={s} style={{ fontSize: "9px", background: `${accentColor}15`, color: accentColor, padding: "2px 7px", borderRadius: "4px", fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay when not yet translated (right panel only) */}
        {dimmed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="9" />
                  <path d="M3 10h5.5M3 7h3.5M3 13h3.5" />
                  <path d="M10 6l4 4-4 4" />
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Translation will appear here</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>Click Translate Resume</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TranslationPreview({ state, translated }: TranslationPreviewProps) {
  const lang = state.targetLanguage;
  const translatedSummary = TRANSLATED_SUMMARIES[lang] ?? ORIGINAL.summary;
  const translatedRoles   = TRANSLATED_ROLES[lang];

  const translatedExperience = ORIGINAL.experience.map((exp, i) => ({
    ...exp,
    role: translatedRoles ? translatedRoles[i] ?? exp.role : exp.role,
  }));

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
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Side-by-side preview</p>
        <div className="flex items-center gap-3">
          {translated && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Translated
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Split panels */}
      <div
        style={{ background: "#e5e7eb", padding: "12px" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Original */}
          <ResumeCard
            label={`Original · ${state.sourceLanguage}`}
            accentColor="#374151"
            name={ORIGINAL.name}
            title={ORIGINAL.title}
            contact={ORIGINAL.contact}
            summary={ORIGINAL.summary}
            experience={ORIGINAL.experience}
            education={ORIGINAL.education}
            skills={ORIGINAL.skills}
          />

          {/* Translated */}
          <ResumeCard
            label={`Translated · ${state.targetLanguage}`}
            accentColor="#059669"
            name={ORIGINAL.name}
            title={translated ? (translatedRoles?.[0] ?? ORIGINAL.title) : ORIGINAL.title}
            contact={ORIGINAL.contact}
            summary={translated ? translatedSummary : ORIGINAL.summary}
            experience={translated ? translatedExperience : ORIGINAL.experience}
            education={ORIGINAL.education}
            skills={ORIGINAL.skills}
            dimmed={!translated}
          />
        </div>
      </div>
    </div>
  );
}
