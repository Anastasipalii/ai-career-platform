"use client";

import { MapPin } from "lucide-react";
import type { Radius, SearchLocationPrefs } from "@/lib/jobs/location";
import { COUNTRIES } from "@/lib/geo/countries";

// Editable Search Preferences shown before the run. The Target Profession is the
// SOURCE OF TRUTH for the job search (provider query + domain family). It starts
// empty and is required to run — a non-binding résumé suggestion may be offered
// but never auto-replaces what the user typed. Location is never prefilled from
// the résumé. Purely presentational — filtering logic lives in @/lib/jobs/location.
const RADII: Radius[] = [25, 50, 100, 200];

interface Props {
  value: SearchLocationPrefs;
  onChange: (next: SearchLocationPrefs) => void;
  disabled?: boolean;
  /** Non-binding profession suggested from the résumé (may be empty). */
  suggestion?: string;
}

export default function SearchPreferences({ value, onChange, disabled, suggestion }: Props) {
  const set = <K extends keyof SearchLocationPrefs>(k: K, v: SearchLocationPrefs[K]) => onChange({ ...value, [k]: v });
  const input =
    "w-full min-w-0 px-3 py-2 rounded-lg text-sm text-white bg-[#0d0d14] border border-white/10 focus:border-violet-500/50 outline-none disabled:opacity-50";

  const target = (value.targetProfession ?? "").trim();
  const trimmedSuggestion = (suggestion ?? "").trim();
  // Offer the suggestion only when it differs from what the user already typed.
  const showSuggestion = trimmedSuggestion.length > 0 && trimmedSuggestion.toLowerCase() !== target.toLowerCase();

  return (
    <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(8,8,14,0.5)" }}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={15} className="text-violet-300" />
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Search preferences</span>
        <span className="text-[11px] text-slate-500">— leave City &amp; Country empty to search globally; set them to filter by location</span>
      </div>

      {/* Target profession — REQUIRED, source of truth for the job search. */}
      <div className="mb-3">
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Target profession / job title <span className="text-violet-300">*</span>
          </span>
          <input
            type="text"
            value={value.targetProfession ?? ""}
            disabled={disabled}
            placeholder="e.g. Restaurant Manager, Frontend Developer, Legal Consultant"
            onChange={(e) => set("targetProfession", e.target.value)}
            className={input}
            aria-label="Target profession or job title"
          />
        </label>
        {showSuggestion && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-slate-500">Suggested from your résumé:</span>
            <span className="text-slate-300">{trimmedSuggestion}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => set("targetProfession", trimmedSuggestion)}
              className="px-2 py-0.5 rounded-md border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 transition disabled:opacity-50"
            >
              Use suggestion
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">City</span>
          <input type="text" value={value.city ?? ""} disabled={disabled} placeholder="e.g. Düsseldorf"
            onChange={(e) => set("city", e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Country</span>
          <select value={value.country ?? ""} disabled={disabled} onChange={(e) => set("country", e.target.value)} className={input}>
            <option value="">Select country (optional)</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Radius</span>
          <select value={value.radiusKm ?? 100} disabled={disabled}
            onChange={(e) => set("radiusKm", Number(e.target.value) as Radius)} className={input}>
            {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 justify-center text-xs text-slate-300">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={!!value.remoteWorldwide} disabled={disabled}
              onChange={(e) => set("remoteWorldwide", e.target.checked)} className="accent-violet-500" />
            Remote jobs (worldwide)
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={value.hybridWithinRadius !== false} disabled={disabled}
              onChange={(e) => set("hybridWithinRadius", e.target.checked)} className="accent-violet-500" />
            Hybrid within radius
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={value.onsiteWithinRadius !== false} disabled={disabled}
              onChange={(e) => set("onsiteWithinRadius", e.target.checked)} className="accent-violet-500" />
            On-site within radius
          </label>
        </div>
      </div>
    </div>
  );
}
