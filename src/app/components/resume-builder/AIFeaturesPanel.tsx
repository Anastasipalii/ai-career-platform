"use client";

import { useState, useEffect, ReactNode } from "react";
import {
  ResumeFormData,
  ExperienceEntry,
  TRANSLATION_LANGUAGES,
} from "@/app/components/resume-builder/types";

// ── Tool IDs ──────────────────────────────────────────────────────────────────
type ToolId =
  | "ats_score"
  | "translation"
  | "rewriter"
  | "keyword_match"
  | "grammar"
  | "cover_letter";

// ── API result shapes ─────────────────────────────────────────────────────────
interface ATSResult {
  score: number;
  suggestions: string[];
  error?: string;
}

interface KeywordResult {
  score: number;
  matching: string[];
  missing: string[];
  recommendations: string;
  error?: string;
}

// ── Resume → plain text (for AI context) ─────────────────────────────────────
function resumeToText(f: ResumeFormData): string {
  const parts: string[] = [];
  if (f.fullName)    parts.push(`Name: ${f.fullName}`);
  if (f.jobTitle)    parts.push(`Title: ${f.jobTitle}`);
  if (f.summary)     parts.push(`Summary:\n${f.summary}`);
  if (f.skills.length) parts.push(`Skills: ${f.skills.join(", ")}`);
  if (f.experience.length) {
    parts.push("Experience:");
    f.experience.forEach((e) => {
      parts.push(
        `${e.role} at ${e.company} (${e.startDate}–${e.endDate})\n${e.description}`
      );
    });
  }
  if (f.education.length) {
    parts.push("Education:");
    f.education.forEach((e) =>
      parts.push(`${e.degree}${e.field ? ` in ${e.field}` : ""}, ${e.institution}`)
    );
  }
  return parts.join("\n\n");
}

// ── Stream a text/plain response ──────────────────────────────────────────────
async function readStream(
  res: Response,
  onChunk: (accumulated: string) => void
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream.");
  const decoder = new TextDecoder();
  let accumulated = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    onChunk(accumulated);
  }
  return accumulated;
}

// ── Section helpers ───────────────────────────────────────────────────────────
type ResumeSection = "summary" | "experience" | "skills";

function getSectionText(formData: ResumeFormData, section: ResumeSection): string {
  if (section === "summary")    return formData.summary;
  if (section === "experience") return formData.experience[0]?.description ?? "";
  return formData.skills.join(", ");
}

function applyToSection(
  formData: ResumeFormData,
  section: ResumeSection,
  text: string,
  onUpdate: (u: Partial<ResumeFormData>) => void
) {
  if (section === "summary") {
    onUpdate({ summary: text });
  } else if (section === "experience") {
    onUpdate({
      experience: formData.experience.map((exp, i) =>
        i === 0 ? ({ ...exp, description: text } as ExperienceEntry) : exp
      ),
    });
  } else {
    const skills = text.split(",").map((s) => s.trim()).filter(Boolean);
    if (skills.length > 0) onUpdate({ skills });
  }
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 " +
  "placeholder-slate-500 transition-all input-glow";

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

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

function ChevronDown() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OutputBox({ text, placeholder }: { text: string; placeholder?: string }) {
  if (!text && !placeholder) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {text || <span className="text-slate-600 italic">{placeholder}</span>}
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-red-300"
      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
        <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
      <span className="flex-1 leading-relaxed">{message}</span>
      <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100 text-base leading-none ml-1">×</button>
    </div>
  );
}

function SectionPills({
  value,
  onChange,
  disabled,
}: {
  value: ResumeSection;
  onChange: (s: ResumeSection) => void;
  disabled: boolean;
}) {
  const sections: ResumeSection[] = ["summary", "experience", "skills"];
  return (
    <div className="flex gap-1.5">
      {sections.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          disabled={disabled}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize disabled:opacity-50"
          style={
            value === s
              ? { background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }
          }
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ── ATS Score circle ──────────────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Strong" : score >= 60 ? "Moderate" : "Needs work";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="absolute" width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            transform="rotate(-90 48 48)"
          />
        </svg>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color }}>{score}</div>
          <div className="text-[10px] text-slate-500">/ 100</div>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Keyword chips ─────────────────────────────────────────────────────────────
function KeywordChips({ keywords, variant }: { keywords: string[]; variant: "match" | "missing" }) {
  const isMatch = variant === "match";
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <span
          key={k}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={
            isMatch
              ? { background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }
              : { background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.18)" }
          }
        >
          {isMatch ? "✓ " : "✗ "}{k}
        </span>
      ))}
    </div>
  );
}

// ── Tool Modal ────────────────────────────────────────────────────────────────
function ToolModal({
  tool,
  toolMeta,
  formData,
  onUpdate,
  onClose,
}: {
  tool: ToolId;
  toolMeta: { title: string; color: string; bg: string; border: string; icon: ReactNode };
  formData: ResumeFormData;
  onUpdate: (u: Partial<ResumeFormData>) => void;
  onClose: () => void;
}) {
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [streamOutput, setStreamOutput] = useState("");
  const [applied, setApplied]           = useState(false);

  // JSON results
  const [atsResult, setAtsResult]             = useState<ATSResult | null>(null);
  const [keywordResult, setKeywordResult]     = useState<KeywordResult | null>(null);

  // Tool-specific inputs
  const [section, setSection]             = useState<ResumeSection>("summary");
  const [targetLang, setTargetLang]       = useState("German");
  const [jobDesc, setJobDesc]             = useState("");
  const [rewriteInput, setRewriteInput]   = useState("");
  const [coverJobTitle, setCoverJobTitle] = useState(formData.jobTitle);
  const [coverCompany, setCoverCompany]   = useState("");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-run ATS score on open
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (tool === "ats_score") runATS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeText = resumeToText(formData);

  // ── Tool handlers ───────────────────────────────────────────────────────────
  async function runATS() {
    setLoading(true); setError(null); setAtsResult(null);
    try {
      const res = await fetch("/api/resume/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "ats_score", resumeText }),
      });
      const data = (await res.json()) as ATSResult;
      if (!res.ok || data.error) throw new Error(data.error ?? "ATS analysis failed.");
      setAtsResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runKeywordMatch() {
    if (!jobDesc.trim()) { setError("Please paste a job description."); return; }
    setLoading(true); setError(null); setKeywordResult(null);
    try {
      const res = await fetch("/api/resume/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "keyword_match", resumeText, jobDescription: jobDesc }),
      });
      const data = (await res.json()) as KeywordResult;
      if (!res.ok || data.error) throw new Error(data.error ?? "Keyword analysis failed.");
      setKeywordResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runStreaming(endpoint: string, body: Record<string, unknown>) {
    setLoading(true); setError(null); setStreamOutput(""); setApplied(false);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? "Request failed.");
      }
      await readStream(res, (text) => setStreamOutput(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!streamOutput.trim()) return;
    applyToSection(formData, section, streamOutput, onUpdate);
    setApplied(true);
  }

  function copyToClipboard() {
    if (!streamOutput) return;
    navigator.clipboard.writeText(streamOutput).catch(() => {});
  }

  function addMissingKeywords() {
    if (!keywordResult?.missing.length) return;
    const merged = [...new Set([...formData.skills, ...keywordResult.missing])];
    onUpdate({ skills: merged });
    setApplied(true);
  }

  // ── Modal content per tool ──────────────────────────────────────────────────
  const renderBody = () => {
    switch (tool) {
      // ── ATS SCORE ──────────────────────────────────────────────────────────
      case "ats_score":
        return (
          <div className="flex flex-col gap-4">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner size={28} />
                <p className="text-sm text-slate-400">Analysing your resume…</p>
              </div>
            )}
            {atsResult && (
              <>
                <div className="flex justify-center">
                  <ScoreCircle score={atsResult.score} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Improvements to make:</p>
                  <ul className="flex flex-col gap-1.5">
                    {atsResult.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }}>→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={runATS}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors self-start"
                >
                  ↺ Re-analyse
                </button>
              </>
            )}
          </div>
        );

      // ── TRANSLATION ────────────────────────────────────────────────────────
      case "translation":
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Target Language</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    disabled={loading}
                  >
                    {TRANSLATION_LANGUAGES.filter((l) => !l.startsWith("English")).map((l) => (
                      <option key={l} value={l} style={{ background: "#0d0d16" }}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Section</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={section}
                    onChange={(e) => setSection(e.target.value as ResumeSection)}
                    disabled={loading}
                  >
                    <option value="summary"    style={{ background: "#0d0d16" }}>Summary</option>
                    <option value="experience" style={{ background: "#0d0d16" }}>Experience</option>
                    <option value="skills"     style={{ background: "#0d0d16" }}>Skills</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runStreaming("/api/resume/improve", {
                  action: "translate",
                  text: getSectionText(formData, section),
                  context: `${formData.jobTitle || "resume"} ${section}`,
                  targetLanguage: targetLang,
                })
              }
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: loading ? "none" : "0 0 20px rgba(16,185,129,0.25)" }}
            >
              {loading ? <><Spinner /> Translating…</> : "Translate"}
            </button>
            {streamOutput && (
              <>
                <OutputBox text={streamOutput} />
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applied}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={applied
                    ? { background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }
                    : { background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }
                  }
                >
                  {applied ? "✓ Applied to Resume" : "Apply Translation"}
                </button>
              </>
            )}
          </div>
        );

      // ── REWRITER ───────────────────────────────────────────────────────────
      case "rewriter":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">
                Content to rewrite <span className="text-slate-600">(paste bullets, summary, or any text)</span>
              </label>
              <textarea
                className={inputCls + " resize-none"}
                rows={4}
                placeholder="Paste the resume text you want to improve…"
                value={rewriteInput}
                onChange={(e) => setRewriteInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">or auto-fill from</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div className="flex gap-2">
              {(["summary", "experience"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRewriteInput(getSectionText(formData, s))}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.15)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={loading || !rewriteInput.trim()}
              onClick={() =>
                runStreaming("/api/resume/tools", {
                  tool: "rewriter",
                  inputText: rewriteInput,
                  context: `${formData.jobTitle || "resume"}`,
                })
              }
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: loading ? "none" : "0 0 20px rgba(124,58,237,0.25)" }}
            >
              {loading ? <><Spinner /> Rewriting…</> : "Rewrite with AI"}
            </button>
            {streamOutput && (
              <>
                <OutputBox text={streamOutput} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { applyToSection(formData, "summary", streamOutput, onUpdate); setApplied(true); }}
                    disabled={applied}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    {applied ? "✓ Applied" : "Insert into Summary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyToSection(formData, "experience", streamOutput, onUpdate); setApplied(true); }}
                    disabled={applied}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.15)" }}
                  >
                    Insert into Experience
                  </button>
                </div>
              </>
            )}
          </div>
        );

      // ── KEYWORD MATCH ──────────────────────────────────────────────────────
      case "keyword_match":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Paste Job Description</label>
              <textarea
                className={inputCls + " resize-none"}
                rows={5}
                placeholder="Paste the full job description here…"
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              disabled={loading || !jobDesc.trim()}
              onClick={runKeywordMatch}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #b45309, #f59e0b)", boxShadow: loading ? "none" : "0 0 20px rgba(245,158,11,0.25)" }}
            >
              {loading ? <><Spinner /> Analysing…</> : "Analyse Keyword Match"}
            </button>
            {loading && !keywordResult && (
              <div className="flex items-center gap-2 text-sm text-slate-400 justify-center py-2">
                <Spinner /> Comparing resume with job description…
              </div>
            )}
            {keywordResult && (
              <div className="flex flex-col gap-4">
                {/* Score */}
                <div className="flex items-center gap-3">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: keywordResult.score >= 70 ? "#10b981" : keywordResult.score >= 50 ? "#f59e0b" : "#ef4444" }}
                  >
                    {keywordResult.score}%
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Keyword Match</p>
                    <p className="text-xs text-slate-500">{keywordResult.recommendations}</p>
                  </div>
                </div>
                {/* Matching */}
                {keywordResult.matching.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">✓ Found in your resume</p>
                    <KeywordChips keywords={keywordResult.matching} variant="match" />
                  </div>
                )}
                {/* Missing */}
                {keywordResult.missing.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">✗ Missing from your resume</p>
                    <KeywordChips keywords={keywordResult.missing} variant="missing" />
                    <button
                      type="button"
                      onClick={addMissingKeywords}
                      disabled={applied}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      {applied ? "✓ Keywords Added to Skills" : `Add ${keywordResult.missing.length} Missing Keywords to Skills`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      // ── GRAMMAR ────────────────────────────────────────────────────────────
      case "grammar":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-2">Section to fix</label>
              <SectionPills value={section} onChange={setSection} disabled={loading} />
            </div>
            <OutputBox
              text=""
              placeholder={getSectionText(formData, section) || "This section is empty — add content first."}
            />
            <button
              type="button"
              disabled={loading || !getSectionText(formData, section).trim()}
              onClick={() =>
                runStreaming("/api/resume/tools", {
                  tool: "grammar",
                  inputText: getSectionText(formData, section),
                  context: `${formData.jobTitle || "resume"} ${section}`,
                })
              }
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #9d174d, #ec4899)", boxShadow: loading ? "none" : "0 0 20px rgba(236,72,153,0.25)" }}
            >
              {loading ? <><Spinner /> Fixing…</> : "Fix Grammar & Style"}
            </button>
            {streamOutput && (
              <>
                <OutputBox text={streamOutput} />
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applied}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={applied
                    ? { background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }
                    : { background: "rgba(236,72,153,0.1)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.2)" }
                  }
                >
                  {applied ? "✓ Applied to Resume" : "Apply Fixes"}
                </button>
              </>
            )}
          </div>
        );

      // ── COVER LETTER ───────────────────────────────────────────────────────
      case "cover_letter":
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Job Title</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Senior Product Designer"
                  value={coverJobTitle}
                  onChange={(e) => setCoverJobTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Company</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Stripe"
                  value={coverCompany}
                  onChange={(e) => setCoverCompany(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={loading || !coverJobTitle.trim()}
              onClick={() =>
                runStreaming("/api/resume/tools", {
                  tool: "cover_letter",
                  resumeText,
                  jobTitle: coverJobTitle.trim(),
                  company: coverCompany.trim() || "the company",
                })
              }
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #5b21b6, #8b5cf6)", boxShadow: loading ? "none" : "0 0 20px rgba(139,92,246,0.25)" }}
            >
              {loading ? <><Spinner /> Generating…</> : "Generate Cover Letter"}
            </button>
            {streamOutput && (
              <>
                <OutputBox text={streamOutput} placeholder="Cover letter will appear here…" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="7" height="8" rx="1" />
                      <path d="M9 4V2.5a.5.5 0 00-.5-.5h-6a.5.5 0 00-.5.5v7a.5.5 0 00.5.5H4" />
                    </svg>
                    Copy to Clipboard
                  </button>
                  <a
                    href="/cover-letter"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.15)" }}
                  >
                    Open Cover Letter Tool →
                  </a>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  // ── Modal wrapper ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
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
            style={{ background: toolMeta.bg, color: toolMeta.color, border: `1px solid ${toolMeta.border}` }}
          >
            {toolMeta.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">{toolMeta.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && <div className="mb-4"><ErrorBanner message={error} onClose={() => setError(null)} /></div>}
          {renderBody()}
        </div>
      </div>
    </div>
  );
}

// ── AI Assistance compact items ───────────────────────────────────────────────
interface AssistItem {
  id: ToolId;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const ASSIST_ITEMS: AssistItem[] = [
  {
    id: "rewriter",
    title: "Improve writing",
    description: "Rewrite bullet points into strong, quantified impact statements",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 2.5a1.5 1.5 0 012.121 2.121L5 13.25l-3 .75.75-3 8.75-8.5z" />
      </svg>
    ),
    color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)",
  },
  {
    id: "grammar",
    title: "Fix grammar",
    description: "Correct tense, passive voice, and style across any section",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5V3h10v2M7 3v10M5.5 13h3" />
      </svg>
    ),
    color: "#ec4899", bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.2)",
  },
  {
    id: "translation",
    title: "Translate section",
    description: "Translate summary, experience, or skills into 25+ languages",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="7" />
        <path d="M1 8h14M8 1a10 10 0 010 14M8 1a10 10 0 000 14" />
      </svg>
    ),
    color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)",
  },
];

// ── Main export ───────────────────────────────────────────────────────────────
interface AIFeaturesPanelProps {
  formData: ResumeFormData;
  onUpdate: (updates: Partial<ResumeFormData>) => void;
}

export default function AIFeaturesPanel({ formData, onUpdate }: AIFeaturesPanelProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  const activeMeta = activeTool
    ? ASSIST_ITEMS.find((f) => f.id === activeTool) ?? null
    : null;

  return (
    <>
      <section className="py-12 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
              AI assistance
            </span>
            <div className="section-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ASSIST_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTool(item.id)}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5"
                style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
                  style={{ background: item.bg, color: item.color, border: `1px solid ${item.border}` }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
                  <p className="text-xs text-slate-600 leading-snug mt-0.5 truncate">{item.description}</p>
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className="shrink-0 ml-auto text-slate-600 group-hover:text-slate-400 transition-colors"
                >
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tool modal */}
      {activeTool && activeMeta && (
        <ToolModal
          tool={activeTool}
          toolMeta={activeMeta}
          formData={formData}
          onUpdate={onUpdate}
          onClose={() => setActiveTool(null)}
        />
      )}
    </>
  );
}
