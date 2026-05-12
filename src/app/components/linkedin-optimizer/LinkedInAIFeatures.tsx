"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Tool IDs ──────────────────────────────────────────────────────────────────
type LinkedInTool =
  | "headline"
  | "about_rewriter"
  | "keyword_optimization"
  | "ats_wording"
  | "tone_enhancement"
  | "visibility_boost"
  | "networking_bio"
  | "professional_branding";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm " +
  "text-slate-200 placeholder-slate-500 transition-all input-glow";
const selectCls = inputCls + " appearance-none cursor-pointer pr-8";
const textareaCls = inputCls + " resize-none";

const TONES = ["Professional", "Confident", "Friendly", "Executive", "Creative", "Minimal", "Corporate"] as const;

// ── Stream helper ─────────────────────────────────────────────────────────────
async function streamTool(
  body: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<{ ok: boolean; errorMessage?: string }> {
  const res = await fetch("/api/linkedin/tools", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    return { ok: false, errorMessage: err.error ?? "Request failed." };
  }

  const reader = res.body?.getReader();
  if (!reader) return { ok: false, errorMessage: "No response stream." };

  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
  return { ok: true };
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin shrink-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <path
        d={`M ${size / 2} 2 a ${size / 2 - 2} ${size / 2 - 2} 0 0 1 ${size / 2 - 2} ${size / 2 - 2}`}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  );
}

// ── ChevronDown ───────────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Tool Modal ────────────────────────────────────────────────────────────────
interface ToolDef {
  id: LinkedInTool;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: ReactNode;
}

function ToolModal({
  tool,
  onClose,
}: {
  tool: ToolDef;
  onClose: () => void;
}) {
  const router = useRouter();

  // shared inputs
  const [role, setRole]         = useState("");
  const [industry, setIndustry] = useState("");
  const [tone, setTone]         = useState("Professional");
  const [goals, setGoals]       = useState("");
  const [currentText, setCurrentText] = useState("");

  // state
  const [loading, setLoading]       = useState(false);
  const [output, setOutput]         = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOutput("");
    setSaveStatus("idle");

    const { ok, errorMessage } = await streamTool(
      { tool: tool.id, role, industry, tone, goals, currentText },
      (chunk) => setOutput((prev) => prev + chunk)
    );

    if (!ok) setError(errorMessage ?? "Generation failed.");
    setLoading(false);
  }, [tool.id, role, industry, tone, goals, currentText]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSave = async () => {
    if (!output.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    setSaveStatus("saving");
    const { error: dbErr } = await supabase.from("linkedin_profiles").insert({
      user_id:           session.user.id,
      headline:          tool.id === "headline" ? output.substring(0, 220) : null,
      about:             tool.id === "about_rewriter" ? output : null,
      skills:            [],
      optimized_content: { tool: tool.id, result: output, role, industry, tone },
    });
    if (dbErr) {
      setError(`Save failed: ${dbErr.message}`);
      setSaveStatus("idle");
    } else {
      setSaveStatus("saved");
    }
  };

  // ── Tool-specific input fields ────────────────────────────────────────────
  const renderInputs = () => {
    switch (tool.id) {
      case "headline":
        return (
          <>
            <Field label="Your Role / Job Title *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry">
              <input className={inputCls} placeholder="e.g. Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Tone">
              <ToneSelect value={tone} onChange={setTone} disabled={loading} />
            </Field>
            <Field label="Career Goals (optional)">
              <input className={inputCls} placeholder="e.g. Open to senior roles, building in public" value={goals} onChange={(e) => setGoals(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Current Headline (optional — paste to rewrite)">
              <input className={inputCls} placeholder="Your existing headline…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "about_rewriter":
        return (
          <>
            <Field label="Your Role">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Tone">
              <ToneSelect value={tone} onChange={setTone} disabled={loading} />
            </Field>
            <Field label="Current About Section (paste to rewrite, or leave blank for scratch)">
              <textarea className={textareaCls} rows={4} placeholder="Paste your current About section here…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "keyword_optimization":
        return (
          <>
            <Field label="Target Role / Job Title *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry *">
              <input className={inputCls} placeholder="e.g. Technology, Finance, Healthcare" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Content to Optimise (headline, about, or experience)">
              <textarea className={textareaCls} rows={4} placeholder="Paste your LinkedIn content here to add recruiter keywords…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "ats_wording":
        return (
          <>
            <Field label="Target Role / Job Title *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry">
              <input className={inputCls} placeholder="e.g. Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Experience Descriptions to Rewrite">
              <textarea className={textareaCls} rows={5} placeholder={"Paste your experience bullet points or descriptions here…\n\nExample:\n• Led product redesign\n• Managed a team"} value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "tone_enhancement":
        return (
          <>
            <Field label="Your Role">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Target Tone *">
              <ToneSelect value={tone} onChange={setTone} disabled={loading} />
            </Field>
            <Field label="Content to Rewrite *">
              <textarea className={textareaCls} rows={5} placeholder="Paste your headline, about section, or experience text here…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "visibility_boost":
        return (
          <>
            <Field label="Your Role *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry">
              <input className={inputCls} placeholder="e.g. Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Current Profile Text (headline + about — paste to improve)">
              <textarea className={textareaCls} rows={4} placeholder="Paste your headline and about section for tailored visibility tips…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "networking_bio":
        return (
          <>
            <Field label="Your Role *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry *">
              <input className={inputCls} placeholder="e.g. Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Networking Goals">
              <input className={inputCls} placeholder="e.g. Meet founders, find mentors, explore product roles" value={goals} onChange={(e) => setGoals(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Background (optional)">
              <textarea className={textareaCls} rows={3} placeholder="Brief background to personalise the bio…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );

      case "professional_branding":
        return (
          <>
            <Field label="Your Role *">
              <input className={inputCls} placeholder="e.g. Senior Product Designer" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Industry *">
              <input className={inputCls} placeholder="e.g. Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Tone">
              <ToneSelect value={tone} onChange={setTone} disabled={loading} />
            </Field>
            <Field label="Career Goals">
              <input className={inputCls} placeholder="e.g. Move into leadership, grow personal brand" value={goals} onChange={(e) => setGoals(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Current Profile Summary (optional)">
              <textarea className={textareaCls} rows={3} placeholder="Paste your current summary to refine…" value={currentText} onChange={(e) => setCurrentText(e.target.value)} disabled={loading} />
            </Field>
          </>
        );
    }
  };

  const canGenerate = !loading && (
    ["headline", "about_rewriter"].includes(tool.id) ? !!role.trim() :
    ["keyword_optimization", "ats_wording"].includes(tool.id) ? !!role.trim() :
    ["tone_enhancement"].includes(tool.id) ? !!currentText.trim() :
    !!role.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl border flex flex-col overflow-hidden"
        style={{
          background:   "rgba(11,11,20,0.98)",
          borderColor:  "rgba(255,255,255,0.09)",
          maxHeight:    "90vh",
          boxShadow:    "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: tool.bg, color: tool.color, border: `1px solid ${tool.border}` }}
          >
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{tool.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tool.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors shrink-0"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          {/* Inputs */}
          {renderInputs()}

          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-2 px-3 py-3 rounded-xl text-xs text-red-300"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
                <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
              <span className="flex-1 leading-relaxed">{error}</span>
              <button type="button" onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none ml-1">×</button>
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:  `linear-gradient(135deg, #0a66c2, ${tool.color})`,
              boxShadow:   canGenerate ? `0 0 20px rgba(10,102,194,0.25)` : "none",
            }}
          >
            {loading ? <><Spinner size={15} />Generating…</> : (
              <><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                <polygon points="7,1 8.8,4.9 13,5.3 10,8.1 10.9,12.3 7,10.2 3.1,12.3 4,8.1 1,5.3 5.2,4.9" />
              </svg>Generate</>
            )}
          </button>

          {/* Output area */}
          {(output || loading) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-400">AI Output</p>
                {output && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(10,102,194,0.12)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.2)" }}
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                    AI generated
                  </div>
                )}
              </div>
              <div
                className="rounded-xl px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {output || <div className="flex items-center gap-2 text-slate-500"><Spinner size={12} /><span>Writing…</span></div>}
              </div>
            </div>
          )}

          {/* Copy + Save */}
          {output && !loading && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  background: copied ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                  color:      copied ? "#6ee7b7" : "rgba(255,255,255,0.7)",
                  border:     copied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {copied ? (
                  <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Copied!</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25" /><path d="M8 4V2.5a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5v7a.5.5 0 00.5.5H4" stroke="currentColor" strokeWidth="1.25" /></svg>Copy</>
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={
                  saveStatus === "saved"
                    ? { background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }
                    : { background: "rgba(10,102,194,0.1)", color: "#93c5fd", border: "1px solid rgba(10,102,194,0.2)" }
                }
              >
                {saveStatus === "saving" ? (
                  <><Spinner size={12} />Saving…</>
                ) : saveStatus === "saved" ? (
                  <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Saved!</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 1.5h7.5l2.5 2.5v8H1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /><rect x="3.5" y="7.5" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1" /><rect x="4" y="1.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" /></svg>Save</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Tone select ───────────────────────────────────────────────────────────────
function ToneSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div className="relative">
      <select
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {TONES.map((t) => (
          <option key={t} value={t} style={{ background: "#0d0d16" }}>{t}</option>
        ))}
      </select>
      <ChevronDown />
    </div>
  );
}

// ── Feature card data ─────────────────────────────────────────────────────────
const FEATURES: ToolDef[] = [
  {
    id: "headline",
    title: "AI Headline Generator",
    description: "Creates a keyword-rich, scroll-stopping headline tailored to your tone, goals, and target audience — under 220 characters.",
    color: "#0a66c2", bg: "rgba(10,102,194,0.1)", border: "rgba(10,102,194,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: "about_rewriter",
    title: "About Section Rewriter",
    description: "Transforms your raw summary into a compelling professional narrative that recruiters actually read beyond the first line.",
    color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "keyword_optimization",
    title: "Recruiter Keyword Optimization",
    description: "Embeds the exact keywords and phrases that recruiters search for — boosting your profile in LinkedIn's search algorithm.",
    color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
  },
  {
    id: "ats_wording",
    title: "ATS-Friendly Wording",
    description: "Ensures your experience descriptions pass automated screening systems with the right action verbs and quantifiable achievements.",
    color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" /><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
      </svg>
    ),
  },
  {
    id: "tone_enhancement",
    title: "Tone Enhancement",
    description: "Rewrites your content in one of 7 professionally calibrated tones — from Minimal to Executive — without losing your authentic voice.",
    color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: "visibility_boost",
    title: "Profile Visibility Boost",
    description: "Adds strategic phrases and formatting improvements known to increase LinkedIn's SSI (Social Selling Index) and search ranking.",
    color: "#ec4899", bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    id: "networking_bio",
    title: "Networking Bio Suggestions",
    description: "Generates a concise, memorable connection request message and bio snippet for outreach that actually gets responses.",
    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: "professional_branding",
    title: "Professional Branding",
    description: "Aligns your headline, summary, and experience into a cohesive personal brand narrative that's consistent and credible.",
    color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

// ── Main export ───────────────────────────────────────────────────────────────
export default function LinkedInAIFeatures() {
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);

  return (
    <>
      <section className="py-24 relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(10,102,194,0.05) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5"
              style={{ borderColor: "rgba(10,102,194,0.3)", background: "rgba(10,102,194,0.08)" }}
            >
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#93c5fd" }}>
                AI features
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Eight ways AI{" "}
              <span className="gradient-text">improves your profile</span>
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
              Each optimization pass targets a specific part of your LinkedIn presence — click any card to use it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat) => (
              <button
                key={feat.id}
                type="button"
                onClick={() => setActiveTool(feat)}
                className="group relative rounded-2xl p-5 border text-left transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 cursor-pointer"
                style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${feat.bg} 0%, transparent 55%)` }}
                />

                {/* "Use →" hover badge */}
                <div
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: feat.bg, color: feat.color, border: `1px solid ${feat.border}` }}
                >
                  Use →
                </div>

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: feat.bg, color: feat.color, border: `1px solid ${feat.border}` }}
                >
                  {feat.icon}
                </div>
                <h3 className="text-white font-semibold text-base mb-2 leading-snug">{feat.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tool modal */}
      {activeTool && (
        <ToolModal
          tool={activeTool}
          onClose={() => setActiveTool(null)}
        />
      )}
    </>
  );
}
