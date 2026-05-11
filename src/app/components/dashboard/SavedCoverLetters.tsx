interface CoverLetter {
  id: number;
  company: string;
  position: string;
  language: string;
  date: string;
}

const letters: CoverLetter[] = [
  { id: 1, company: "Stripe",  position: "Senior Product Designer",  language: "English (US)", date: "3 days ago" },
  { id: 2, company: "Figma",   position: "Lead UX Designer",          language: "English (US)", date: "1 week ago" },
  { id: 3, company: "Vercel",  position: "Staff Designer",            language: "German",       date: "2 weeks ago" },
];

const COMPANY_COLORS: Record<string, { color: string; bg: string }> = {
  Stripe: { color: "#635bff", bg: "rgba(99,91,255,0.12)" },
  Figma:  { color: "#f24e1e", bg: "rgba(242,78,30,0.1)" },
  Vercel: { color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
};

export default function SavedCoverLetters() {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-semibold text-white">Saved Cover Letters</h2>
        <a href="/cover-letter" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
          + New letter
        </a>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {letters.map((letter) => {
          const cc = COMPANY_COLORS[letter.company] ?? { color: "#94a3b8", bg: "rgba(255,255,255,0.06)" };
          return (
            <div
              key={letter.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Company avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.color}33` }}
              >
                {letter.company[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{letter.position}</p>
                <p className="text-xs text-slate-500 mt-0.5">{letter.company} · {letter.language} · {letter.date}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { label: "Edit",     color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.2)" },
                  { label: "Download", color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.15)" },
                  { label: "Copy",     color: "#475569", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:opacity-90"
                    style={{ background: btn.bg, color: btn.color, border: `1px solid ${btn.border}` }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
