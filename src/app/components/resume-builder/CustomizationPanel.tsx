import {
  ColorTheme,
  FontOption,
  LayoutOption,
  SpacingOption,
  CustomizationSettings,
} from "@/app/components/resume-builder/types";

interface CustomizationPanelProps {
  settings: CustomizationSettings;
  onChange: (settings: CustomizationSettings) => void;
}

const COLOR_SWATCHES: { theme: ColorTheme; color: string; label: string }[] = [
  { theme: "Purple Neon",   color: "#7c3aed", label: "Purple" },
  { theme: "Navy Blue",     color: "#1e40af", label: "Navy" },
  { theme: "Emerald Green", color: "#059669", label: "Emerald" },
  { theme: "Burgundy",      color: "#9f1239", label: "Burgundy" },
  { theme: "Black & White", color: "#111827", label: "Black" },
  { theme: "Soft Beige",    color: "#c4a35a", label: "Beige" },
  { theme: "Minimal Gray",  color: "#6b7280", label: "Gray" },
];

const FONT_OPTIONS: { value: FontOption; label: string }[] = [
  { value: "Minimal",      label: "Modern" },
  { value: "Professional", label: "Serif" },
  { value: "Creative",     label: "Creative" },
  { value: "ModernSans",   label: "Mono" },
  { value: "Elegant",      label: "Elegant" },
];

const LAYOUT_OPTIONS: { value: LayoutOption; label: string }[] = [
  { value: "One-column",  label: "Single" },
  { value: "Two-column",  label: "Double" },
  { value: "Sidebar",     label: "Sidebar" },
  { value: "Modern card", label: "Cards" },
];

const SPACING_OPTIONS: { value: SpacingOption; label: string }[] = [
  { value: "Compact",  label: "Compact" },
  { value: "Balanced", label: "Balanced" },
  { value: "Spacious", label: "Spacious" },
];

const pillBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.5)",
};

const pillActive: React.CSSProperties = {
  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
  border: "1px solid transparent",
  color: "white",
};

export default function CustomizationPanel({
  settings,
  onChange,
}: CustomizationPanelProps) {
  const set = <K extends keyof CustomizationSettings>(
    key: K,
    value: CustomizationSettings[K]
  ) => onChange({ ...settings, [key]: value });

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background: "rgba(13,13,22,0.6)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-5">
        Customise
      </p>

      {/* Color theme */}
      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-3">Color theme</p>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_SWATCHES.map((s) => {
            const active = settings.colorTheme === s.theme;
            return (
              <button
                key={s.theme}
                type="button"
                title={s.theme}
                onClick={() => set("colorTheme", s.theme)}
                className="w-7 h-7 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: s.color,
                  boxShadow: active
                    ? `0 0 0 2px #05050a, 0 0 0 4px ${s.color}`
                    : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Font */}
      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-3">Font style</p>
        <div className="flex gap-2 flex-wrap">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => set("font", f.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
              style={settings.font === f.value ? pillActive : pillBase}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-3">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_OPTIONS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => set("layout", l.value)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
              style={settings.layout === l.value ? pillActive : pillBase}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spacing */}
      <div>
        <p className="text-xs text-slate-400 mb-3">Spacing</p>
        <div className="flex gap-2">
          {SPACING_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set("spacing", s.value)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
              style={settings.spacing === s.value ? pillActive : pillBase}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
