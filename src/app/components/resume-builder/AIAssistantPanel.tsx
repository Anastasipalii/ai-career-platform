"use client";

import { useRef, useState } from "react";
import {
  ResumeFormData,
  ExperienceEntry,
  TRANSLATION_LANGUAGES,
} from "@/app/components/resume-builder/types";
import { postResumeAI } from "@/lib/resume/aiRequest";

// Dev-only diagnostic for a 405 on a POST route. The app always sends POST, so a
// 405 means the request reached the server as another method — almost always a
// browser extension or proxy rewriting it (e.g. appending ?cache-bust=<ts> and
// downgrading POST→GET). Logged for developers only; users get a friendly message.
const methodDowngradeHint = (op: string): string =>
  `[AI ${op}] HTTP 405 on a POST-only route: the request reached the server as a non-POST method. ` +
  `The app sends POST — check for a browser extension or proxy that rewrites requests ` +
  `(e.g. appends ?cache-bust=<timestamp> and downgrades POST→GET). Retry in a clean profile with extensions disabled.`;

// ── Types ─────────────────────────────────────────────────────────────────────
type AITab       = "generate" | "improve";
type ImproveSection = "summary" | "experience" | "skills";
type ImproveAction  = "improve" | "rewrite" | "shorten" | "translate";

interface GenerateResult {
  summary?: string;
  experienceDescription?: string;
  suggestedSkills?: string[];
  atsKeywords?: string[];
  error?: string;
}

type SugTarget = "summary" | "experience" | "skills" | "jobTitle";
interface SuggestionChange {
  target: SugTarget;
  label: string;
  before: string;
  after: string;
}
interface Suggestion {
  title: string;
  streaming: boolean;
  changes: SuggestionChange[];
  /** Snapshot of the targeted fields when the request began (stale detection). */
  base: Record<SugTarget, string>;
  retry: () => void;
}

interface AIAssistantPanelProps {
  formData: ResumeFormData;
  onUpdate: (updates: Partial<ResumeFormData>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const EXPERIENCE_OPTIONS = ["< 1 year", "1–2 years", "3–5 years", "6–9 years", "10+ years"] as const;

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow";

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

const uniqStrings = (arr: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.trim();
    if (!k || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out;
};

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <svg className="animate-spin shrink-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <path d={`M ${size / 2} 1.5 a ${size / 2 - 1.5} ${size / 2 - 1.5} 0 0 1 ${size / 2 - 1.5} ${size / 2 - 1.5}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIAssistantPanel({ formData, onUpdate }: AIAssistantPanelProps) {
  const [tab, setTab]         = useState<AITab>("generate");
  const [generating, setGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<ImproveAction | null>(null);
  const [error, setError]     = useState<string | null>(null);
  // The AI's proposed changes. formData is NOT modified until the user clicks Apply.
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  // Monotonic request id — a stale (superseded) response is ignored.
  const reqIdRef = useRef(0);

  // Generate tab state
  const [genJobTitle, setGenJobTitle]   = useState(formData.jobTitle);
  const [genYears, setGenYears]         = useState("3–5 years");
  const [genIndustry, setGenIndustry]   = useState("");
  const [genSkills, setGenSkills]       = useState(formData.skills.join(", "));
  const [genLanguage, setGenLanguage]   = useState("English (US)");

  // Improve tab state
  const [section, setSection]           = useState<ImproveSection>("summary");
  const [translateLang, setTranslateLang] = useState("German");

  const busy = generating || activeAction !== null;

  const currentValue = (t: SugTarget): string => {
    if (t === "summary") return formData.summary;
    if (t === "jobTitle") return formData.jobTitle;
    if (t === "skills") return formData.skills.join(", ");
    return formData.experience[0]?.description ?? "";
  };
  const snapshot = (): Record<SugTarget, string> => ({
    summary: currentValue("summary"),
    experience: currentValue("experience"),
    skills: currentValue("skills"),
    jobTitle: currentValue("jobTitle"),
  });

  // ── Generate → propose a suggestion (never mutates formData) ────────────────
  const handleGenerate = async () => {
    if (!genJobTitle.trim()) { setError("Please enter a target job title."); return; }
    if (busy) return; // guard double-click
    const myReq = ++reqIdRef.current;
    setGenerating(true);
    setError(null);
    setSuggestion(null);
    const base = snapshot();
    try {
      const res = await postResumeAI("/api/resume/generate", {
        jobTitle:        genJobTitle.trim(),
        yearsExperience: genYears,
        industry:        genIndustry.trim() || "Technology",
        skills:          genSkills.split(",").map((s) => s.trim()).filter(Boolean),
        language:        genLanguage,
      });
      const data = (await res.json()) as GenerateResult;
      if (reqIdRef.current !== myReq) return; // superseded
      if (!res.ok || data.error) {
        if (res.status === 405 && process.env.NODE_ENV !== "production") console.warn(methodDowngradeHint("generate"));
        throw new Error(data.error ?? "Generation failed. Please try again.");
      }

      const changes: SuggestionChange[] = [];
      if (data.summary) {
        changes.push({ target: "summary", label: "Professional summary", before: base.summary, after: data.summary });
      }
      if (data.suggestedSkills?.length) {
        const merged = uniqStrings([...formData.skills, ...data.suggestedSkills]);
        changes.push({ target: "skills", label: "Skills (adds new, keeps yours)", before: base.skills, after: merged.join(", ") });
      }
      if (data.experienceDescription) {
        changes.push({ target: "experience", label: "Experience — first role", before: base.experience, after: data.experienceDescription });
      }
      if (!formData.jobTitle.trim() && genJobTitle.trim()) {
        changes.push({ target: "jobTitle", label: "Job title", before: "", after: genJobTitle.trim() });
      }
      if (changes.length === 0) { setError("AI returned no suggestions. Please try again."); return; }
      setSuggestion({ title: "Generated draft — review before applying", streaming: false, changes, base, retry: handleGenerate });
    } catch (err) {
      if (reqIdRef.current === myReq) {
        if (process.env.NODE_ENV !== "production") console.warn("[AI generate] failed:", err);
        setError("We couldn't generate an AI draft. Please try again.");
      }
    } finally {
      if (reqIdRef.current === myReq) setGenerating(false);
    }
  };

  // ── Improve → stream into a SUGGESTION preview (never mutates formData) ──────
  const handleImprove = async (action: ImproveAction) => {
    const current = currentValue(section);
    if (!current.trim()) { setError(`The ${section} section is empty — add content first.`); return; }
    if (busy) return; // guard double-click / concurrent request
    const myReq = ++reqIdRef.current;
    setActiveAction(action);
    setError(null);
    setSuggestion(null);
    const base = snapshot();
    const label = { improve: "Improve", rewrite: "Rewrite", shorten: "Shorten", translate: "Translate" }[action];
    const target: SugTarget = section === "skills" ? "skills" : section === "experience" ? "experience" : "summary";
    const sectionLabel = section === "summary" ? "Professional summary" : section === "experience" ? "Experience — first role" : "Skills";

    const showStreaming = (after: string) => {
      if (reqIdRef.current !== myReq) return;
      setSuggestion({
        title: `${label} · ${sectionLabel}`,
        streaming: true,
        changes: [{ target, label: sectionLabel, before: current, after }],
        base,
        retry: () => handleImprove(action),
      });
    };

    try {
      const res = await postResumeAI("/api/resume/improve", {
        action,
        text: current,
        context: `${formData.jobTitle || "professional"} resume`,
        targetLanguage: action === "translate" ? translateLang : undefined,
      });
      if (!res.ok) {
        if (res.status === 405 && process.env.NODE_ENV !== "production") console.warn(methodDowngradeHint("improve"));
        const errData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(errData.error ?? "Request failed.");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");
      const decoder = new TextDecoder();
      let acc = "";
      showStreaming(acc);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        showStreaming(acc);
      }
      if (reqIdRef.current !== myReq) return; // superseded during stream
      const finalText = acc.trim();
      if (!finalText) { setError("AI returned an empty result. Please try again."); setSuggestion(null); return; }
      setSuggestion({
        title: `${label} · ${sectionLabel}`,
        streaming: false,
        changes: [{ target, label: sectionLabel, before: current, after: finalText }],
        base,
        retry: () => handleImprove(action),
      });
    } catch (err) {
      if (reqIdRef.current === myReq) {
        if (process.env.NODE_ENV !== "production") console.warn("[AI improve] failed:", err);
        setError("We couldn't generate an AI suggestion. Please try again.");
        setSuggestion(null);
      }
    } finally {
      if (reqIdRef.current === myReq) setActiveAction(null);
    }
  };

  // ── Apply / Discard ─────────────────────────────────────────────────────────
  const applySuggestion = () => {
    if (!suggestion || suggestion.streaming) return;
    const updates: Partial<ResumeFormData> = {};
    for (const ch of suggestion.changes) {
      if (ch.target === "summary") updates.summary = ch.after;
      else if (ch.target === "jobTitle") updates.jobTitle = ch.after;
      else if (ch.target === "skills") updates.skills = ch.after.split(",").map((s) => s.trim()).filter(Boolean);
      else if (ch.target === "experience") {
        if (formData.experience.length > 0) {
          updates.experience = formData.experience.map((e, i) => (i === 0 ? { ...e, description: ch.after } : e));
        } else {
          const entry: ExperienceEntry = {
            id: `exp-ai-${Date.now()}`,
            company: genJobTitle.trim(),
            role: genJobTitle.trim(),
            startDate: "",
            endDate: "Present",
            description: ch.after,
          };
          updates.experience = [entry];
        }
      }
    }
    onUpdate(updates); // ← the ONLY place AI content is written to the résumé
    setSuggestion(null);
    setError(null);
  };

  const discardSuggestion = () => setSuggestion(null);

  const stale = suggestion
    ? suggestion.changes.some((ch) => currentValue(ch.target) !== suggestion.base[ch.target])
    : false;

  // ── Current section preview text (Improve tab) ──────────────────────────────
  const sectionPreview = (() => {
    if (section === "summary")    return formData.summary || null;
    if (section === "experience") return formData.experience[0]?.description || null;
    if (section === "skills")     return formData.skills.length ? formData.skills.join(", ") : null;
    return null;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#a78bfa" strokeWidth="1.3" strokeLinejoin="round">
              <polygon points="6.5,1 8.3,4.7 12.5,5.1 9.5,7.8 10.4,12 6.5,9.9 2.6,12 3.5,7.8 0.5,5.1 4.7,4.7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
            GPT-4o mini
          </span>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["generate", "improve"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 capitalize"
              style={tab === t
                ? { background: "rgba(124,58,237,0.25)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }
                : { color: "#64748b", border: "1px solid transparent" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-300 mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
              <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            <span className="flex-1 leading-relaxed">{error}</span>
            <button type="button" onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none ml-1">×</button>
          </div>
        )}

        {/* ── AI SUGGESTION PREVIEW (nothing is applied to the résumé until Apply) ── */}
        {suggestion && (
          <div className="rounded-xl border mb-4 overflow-hidden" style={{ background: "rgba(124,58,237,0.05)", borderColor: "rgba(124,58,237,0.22)" }}>
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
              <span className="text-xs font-semibold text-violet-200 flex items-center gap-2">
                {suggestion.streaming && <Spinner size={11} />}
                {suggestion.title}
              </span>
              <span className="text-[10px] text-violet-300/70">Suggestion — not yet applied</span>
            </div>

            <div className="px-3.5 py-3 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              {stale && (
                <div className="text-[11px] text-amber-300" role="alert">
                  You’ve edited this section since generating — applying will replace your current version below.
                </div>
              )}
              {suggestion.changes.map((ch, i) => (
                <div key={i}>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{ch.label}</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <div className="rounded-lg px-2.5 py-2 text-[11.5px] leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#7c8698" }}>
                      <span className="text-[9.5px] uppercase tracking-wide text-slate-600 block mb-0.5">Current</span>
                      {currentValue(ch.target).trim() ? currentValue(ch.target) : <span className="italic text-slate-600">(empty)</span>}
                    </div>
                    <div className="rounded-lg px-2.5 py-2 text-[11.5px] leading-relaxed" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", color: "#cbd5e1" }}>
                      <span className="text-[9.5px] uppercase tracking-wide text-emerald-500/80 block mb-0.5">Suggested</span>
                      {ch.after || <span className="italic text-slate-600">…</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2.5 border-t" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
              <button
                type="button"
                onClick={applySuggestion}
                disabled={suggestion.streaming}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={discardSuggestion}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 border transition-colors hover:text-white"
                style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => { const r = suggestion.retry; setSuggestion(null); r(); }}
                disabled={suggestion.streaming || busy}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-violet-300 transition-colors hover:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↻ Try again
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATE TAB ── */}
        {tab === "generate" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Target Job Title <span className="text-violet-400">*</span></label>
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={genJobTitle} onChange={(e) => setGenJobTitle(e.target.value)} disabled={busy} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Experience</label>
                <div className="relative">
                  <select className={selectCls} value={genYears} onChange={(e) => setGenYears(e.target.value)} disabled={busy}>
                    {EXPERIENCE_OPTIONS.map((o) => (<option key={o} value={o} style={{ background: "#0d0d16" }}>{o}</option>))}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Industry</label>
                <input className={inputCls} placeholder="e.g. Technology" value={genIndustry} onChange={(e) => setGenIndustry(e.target.value)} disabled={busy} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Key Skills (comma-separated)</label>
              <input className={inputCls} placeholder="e.g. Figma, React, UX Research" value={genSkills} onChange={(e) => setGenSkills(e.target.value)} disabled={busy} />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Output Language</label>
              <div className="relative">
                <select className={selectCls} value={genLanguage} onChange={(e) => setGenLanguage(e.target.value)} disabled={busy}>
                  {TRANSLATION_LANGUAGES.map((l) => (<option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>))}
                </select>
                <ChevronDown />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy || !genJobTitle.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-1"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: busy ? "none" : "0 0 20px rgba(124,58,237,0.3)" }}
            >
              {generating ? (<><Spinner size={15} />Generating…</>) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                    <polygon points="7,1 8.8,4.9 13,5.3 10,8.1 10.9,12.3 7,10.2 3.1,12.3 4,8.1 1,5.3 5.2,4.9" />
                  </svg>
                  Generate Resume with AI
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-600 text-center -mt-1">
              Proposes a draft summary, experience bullets, and skills — review and Apply before it changes your résumé
            </p>
          </div>
        )}

        {/* ── IMPROVE TAB ── */}
        {tab === "improve" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-2">Section to improve</label>
              <div className="flex gap-1.5">
                {(["summary", "experience", "skills"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize disabled:opacity-50"
                    style={section === s
                      ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", color: sectionPreview ? "#94a3b8" : "#475569", maxHeight: "76px", overflowY: "auto" }}>
              {sectionPreview ?? <span className="italic">This section is empty — add content first.</span>}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-2">Actions</label>
              <div className="grid grid-cols-3 gap-2">
                {(["improve", "rewrite", "shorten"] as const).map((action) => {
                  const isActive = activeAction === action;
                  const labels = { improve: "Improve", rewrite: "Rewrite", shorten: "Shorten" } as const;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleImprove(action)}
                      disabled={busy || !sectionPreview}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={isActive
                        ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.35)" }
                        : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {isActive && <Spinner size={11} />}
                      {labels[action]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Translate</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select className={selectCls} value={translateLang} onChange={(e) => setTranslateLang(e.target.value)} disabled={busy}>
                    {TRANSLATION_LANGUAGES.filter((l) => !l.startsWith("English")).map((l) => (<option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>))}
                  </select>
                  <ChevronDown />
                </div>
                <button
                  type="button"
                  onClick={() => handleImprove("translate")}
                  disabled={busy || !sectionPreview}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={activeAction === "translate"
                    ? { background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }
                    : { background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
                >
                  {activeAction === "translate" ? (<Spinner size={11} />) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                      <circle cx="6" cy="6" r="5" />
                      <path d="M1 6h10M6 1a7.5 7.5 0 010 10M6 1a7.5 7.5 0 000 10" />
                    </svg>
                  )}
                  Translate
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 -mt-1">
              AI proposes a suggestion — nothing changes until you press Apply
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
