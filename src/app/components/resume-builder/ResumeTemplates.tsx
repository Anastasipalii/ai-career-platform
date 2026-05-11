import { TemplateKey } from "@/app/components/resume-builder/types";

interface ResumeTemplatesProps {
  selectedTemplate: TemplateKey;
  onSelect: (key: TemplateKey) => void;
}

const templates: {
  key: TemplateKey;
  label: string;
  description: string;
  accentColor: string;
  mockup: React.ReactNode;
}[] = [
  {
    key: "Minimal",
    label: "Minimal",
    description: "Clean single-column layout with restrained typography and generous whitespace.",
    accentColor: "#6b7280",
    mockup: (
      <svg viewBox="0 0 160 108" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-28">
        <rect width="160" height="108" fill="#f9fafb" rx="4" />
        <rect x="12" y="12" width="72" height="7" rx="2" fill="#374151" />
        <rect x="12" y="22" width="44" height="4" rx="1.5" fill="#9ca3af" />
        <rect x="12" y="34" width="136" height="1" rx="0.5" fill="#e5e7eb" />
        <rect x="12" y="40" width="30" height="3" rx="1" fill="#374151" />
        <rect x="12" y="47" width="136" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="12" y="53" width="110" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="12" y="59" width="120" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="12" y="69" width="30" height="3" rx="1" fill="#374151" />
        <rect x="12" y="76" width="136" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="12" y="82" width="90" height="2.5" rx="1" fill="#d1d5db" />
        <rect x="12" y="92" width="30" height="3" rx="1" fill="#374151" />
        <rect x="12" y="99" width="80" height="2.5" rx="1" fill="#d1d5db" />
      </svg>
    ),
  },
  {
    key: "Corporate",
    label: "Corporate",
    description: "Traditional two-column structure trusted by finance, law, and consulting recruiters.",
    accentColor: "#1e40af",
    mockup: (
      <svg viewBox="0 0 160 108" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-28">
        <rect width="160" height="108" fill="#ffffff" rx="4" />
        <rect width="160" height="22" fill="#1e3a5f" rx="4" />
        <rect y="18" width="160" height="4" fill="#1e3a5f" />
        <rect x="10" y="6" width="60" height="6" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="10" y="14" width="36" height="3" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="10" y="28" width="90" height="2.5" rx="1" fill="#9ca3af" />
        <rect x="10" y="33" width="70" height="2.5" rx="1" fill="#9ca3af" />
        <rect x="10" y="42" width="28" height="3" rx="1" fill="#1e40af" />
        <rect x="10" y="48" width="90" height="2" rx="1" fill="#d1d5db" />
        <rect x="10" y="53" width="78" height="2" rx="1" fill="#d1d5db" />
        <rect x="10" y="58" width="86" height="2" rx="1" fill="#d1d5db" />
        <rect x="110" y="28" width="1" height="76" fill="#e5e7eb" />
        <rect x="118" y="28" width="32" height="3" rx="1" fill="#6b7280" />
        <rect x="118" y="35" width="32" height="2" rx="1" fill="#d1d5db" />
        <rect x="118" y="40" width="26" height="2" rx="1" fill="#d1d5db" />
        <rect x="118" y="48" width="32" height="3" rx="1" fill="#6b7280" />
        <rect x="118" y="55" width="28" height="2" rx="1" fill="#d1d5db" />
        <rect x="118" y="60" width="20" height="2" rx="1" fill="#d1d5db" />
      </svg>
    ),
  },
  {
    key: "Creative",
    label: "Creative",
    description: "Bold sidebar layout with vivid accent colors — built for design, marketing, and creative roles.",
    accentColor: "#7c3aed",
    mockup: (
      <svg viewBox="0 0 160 108" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-28">
        <rect width="160" height="108" fill="#ffffff" rx="4" />
        <rect width="46" height="108" fill="#1e1b4b" rx="4" />
        <rect width="10" height="108" fill="#1e1b4b" />
        <circle cx="23" cy="22" r="12" fill="#7c3aed" fillOpacity="0.5" />
        <rect x="8" y="40" width="30" height="3" rx="1" fill="white" fillOpacity="0.7" />
        <rect x="8" y="47" width="24" height="2" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="8" y="52" width="28" height="2" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="8" y="60" width="30" height="2.5" rx="1" fill="#a78bfa" fillOpacity="0.7" />
        <rect x="8" y="66" width="18" height="5" rx="2.5" fill="#7c3aed" fillOpacity="0.6" />
        <rect x="28" y="66" width="18" height="5" rx="2.5" fill="#7c3aed" fillOpacity="0.4" />
        <rect x="8" y="75" width="18" height="5" rx="2.5" fill="#7c3aed" fillOpacity="0.3" />
        <rect x="56" y="12" width="56" height="6" rx="2" fill="#111827" />
        <rect x="56" y="21" width="36" height="3" rx="1" fill="#7c3aed" />
        <rect x="56" y="32" width="95" height="2" rx="1" fill="#9ca3af" />
        <rect x="56" y="37" width="80" height="2" rx="1" fill="#9ca3af" />
        <rect x="56" y="47" width="40" height="3" rx="1" fill="#374151" />
        <rect x="56" y="53" width="95" height="2" rx="1" fill="#d1d5db" />
        <rect x="56" y="58" width="78" height="2" rx="1" fill="#d1d5db" />
        <rect x="56" y="63" width="86" height="2" rx="1" fill="#d1d5db" />
        <rect x="56" y="73" width="40" height="3" rx="1" fill="#374151" />
        <rect x="56" y="79" width="95" height="2" rx="1" fill="#d1d5db" />
        <rect x="56" y="84" width="60" height="2" rx="1" fill="#d1d5db" />
      </svg>
    ),
  },
  {
    key: "Modern Tech",
    label: "Modern Tech",
    description: "Card-based layout with a gradient accent bar — ideal for software engineers and product managers.",
    accentColor: "#059669",
    mockup: (
      <svg viewBox="0 0 160 108" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-28">
        <rect width="160" height="108" fill="#f9fafb" rx="4" />
        <rect width="160" height="6" rx="3" fill="url(#techGrad)" />
        <rect y="3" width="160" height="3" fill="url(#techGrad)" />
        <rect x="10" y="13" width="140" height="22" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="18" y="19" width="55" height="5" rx="1.5" fill="#111827" />
        <rect x="18" y="27" width="36" height="3" rx="1" fill="#059669" />
        <rect x="10" y="40" width="140" height="16" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="18" y="44" width="110" height="2" rx="1" fill="#9ca3af" />
        <rect x="18" y="49" width="85" height="2" rx="1" fill="#9ca3af" />
        <rect x="10" y="61" width="140" height="22" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="18" y="66" width="40" height="3" rx="1" fill="#374151" />
        <rect x="18" y="72" width="110" height="2" rx="1" fill="#d1d5db" />
        <rect x="18" y="77" width="90" height="2" rx="1" fill="#d1d5db" />
        <rect x="10" y="88" width="67" height="14" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="18" y="93" width="22" height="2.5" rx="1" fill="#374151" />
        <rect x="18" y="98" width="40" height="2" rx="1" fill="#d1d5db" />
        <rect x="83" y="88" width="67" height="14" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <rect x="91" y="93" width="22" height="2.5" rx="1" fill="#374151" />
        <rect x="91" y="98" width="40" height="2" rx="1" fill="#d1d5db" />
        <defs>
          <linearGradient id="techGrad" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
];

export default function ResumeTemplates({
  selectedTemplate,
  onSelect,
}: ResumeTemplatesProps) {
  return (
    <section id="templates" className="py-24 relative">
      <div
        className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
              Templates
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Choose your{" "}
            <span className="gradient-text">perfect layout</span>
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Every template is ATS-tested and recruiter-approved. Select one to
            apply it instantly to your live preview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {templates.map((tpl) => {
            const isSelected = selectedTemplate === tpl.key;
            return (
              <div
                key={tpl.key}
                className="group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer hover:-translate-y-1"
                style={
                  isSelected
                    ? {
                        background: "rgba(13,13,22,0.8)",
                        borderColor: tpl.accentColor,
                        boxShadow: `0 0 32px ${tpl.accentColor}33`,
                      }
                    : {
                        background: "rgba(13,13,22,0.6)",
                        borderColor: "rgba(255,255,255,0.07)",
                      }
                }
                onClick={() => onSelect(tpl.key)}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
                    style={{ background: tpl.accentColor }}
                  >
                    Active
                  </div>
                )}

                {/* SVG mockup */}
                <div
                  className="p-4 pb-0 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  {tpl.mockup}
                </div>

                {/* Card info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">
                    {tpl.label}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    {tpl.description}
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={
                      isSelected
                        ? {
                            background: tpl.accentColor,
                            color: "white",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.6)",
                          }
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(tpl.key);
                    }}
                  >
                    {isSelected ? "Applied" : "Use Template"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
