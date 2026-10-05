"use client";

// ============================================================================
// ResumeAnalysisPanel — transparent résumé analysis (Phase B Step 2).
//
// Two clearly-separated, read-only analyses:
//   1) Résumé Strength — deterministic, runs entirely in the browser (no AI, no
//      network). An estimate of quality/completeness, NOT an ATS/pass prediction.
//   2) Match to a Job — needs a job description. One AI call extracts structured
//      requirements from the JD; matching is deterministic in the browser (the
//      résumé is never sent). Missing keywords are shown, never auto-inserted.
//
// Neither analysis mutates the résumé. The only thing that changes résumé data
// is an explicit per-term "Add to Skills (only if you have it)" click.
// ============================================================================

import { useState } from "react";
import type { ResumeFormData } from "@/app/components/resume-builder/types";
import { isResumeEmpty } from "@/lib/resume/importResume";
import {
  computeResumeStrength,
  strengthBand,
  type ResumeStrengthResult,
} from "@/lib/resume/resumeStrength";
import {
  matchResumeToJob,
  basicTextMatch,
  validateRequirements,
  MIN_JOB_DESCRIPTION_CHARS,
  type JobMatchResult,
  type BasicTextMatchResult,
  type RequirementMatch,
} from "@/lib/resume/jobMatch";
import { postResumeAI } from "@/lib/resume/aiRequest";

interface Props {
  formData: ResumeFormData;
  onUpdate: (updates: Partial<ResumeFormData>) => void;
}

const bandColor = (band: string) =>
  band === "Strong" ? "#10b981" : band === "Solid" ? "#7c3aed" : "#f59e0b";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Résumé Strength ───────────────────────────────────────────────────────────
function StrengthMode({ formData }: { formData: ResumeFormData }) {
  const [result, setResult] = useState<ResumeStrengthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const analyze = () => {
    if (isResumeEmpty(formData)) {
      setError("Add résumé content first, then estimate its strength.");
      setResult(null);
      return;
    }
    setError(null);
    setResult(computeResumeStrength(formData)); // deterministic, in-browser
    setShowDetail(false);
  };

  const band = result ? strengthBand(result.overall) : "";
  const color = bandColor(band);

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div>
        <h3 className="text-sm font-semibold text-white">Résumé Strength</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          An estimate of your résumé&apos;s quality and completeness — not a score from an
          employer&apos;s ATS. Runs entirely in your browser.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-300">{error}</p>
      )}

      <button
        type="button"
        onClick={analyze}
        className="self-start px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
      >
        {result ? "Re-analyze résumé" : "Analyze résumé"}
      </button>

      {result && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold" style={{ color }}>{result.overall}</div>
            <div>
              <div className="text-xs text-slate-500">/ 100</div>
              <div className="text-sm font-medium" style={{ color }}>{band}</div>
            </div>
          </div>

          {/* Compact category breakdown */}
          <div className="flex flex-col gap-2.5">
            {result.categories.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-40 shrink-0">{c.label}</span>
                <Bar value={c.score} max={c.max} color={color} />
                <span className="text-xs text-slate-500 w-12 text-right shrink-0">{c.score}/{c.max}</span>
              </div>
            ))}
          </div>

          {result.recommendations.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                aria-expanded={showDetail}
              >
                {showDetail ? "Hide recommendations" : `Show ${result.recommendations.length} recommendations`}
              </button>
              {showDetail && (
                <ul className="flex flex-col gap-1.5 mt-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }}>→</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Match to a Job ────────────────────────────────────────────────────────────
function EvidenceRow({ m, onAdd, added }: { m: RequirementMatch; onAdd?: () => void; added?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="shrink-0" style={{ color: m.matched ? "#6ee7b7" : "#fca5a5" }}>
        {m.matched ? "✓" : "✕"}
      </span>
      <span className="text-slate-300">{m.term}</span>
      {m.matched ? (
        <span className="text-[11px] text-slate-500">found in {m.evidence}</span>
      ) : (
        onAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={added}
            className="text-[11px] px-2 py-0.5 rounded-full transition-all disabled:opacity-60"
            style={{ background: "rgba(124,58,237,0.14)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
            title="Adds this to your Skills. Only do this if you genuinely have it."
          >
            {added ? "✓ added" : "+ Add to Skills (only if you have it)"}
          </button>
        )
      )}
    </li>
  );
}

function JobMatchMode({ formData, onUpdate }: Props) {
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Two DISTINCT result kinds that are never shown at the same time and never
  // share a score: `full` is the real Job Match (AI-extracted required/preferred
  // + rubric); `basic` is the degraded lexical coverage fallback.
  const [full, setFull] = useState<JobMatchResult | null>(null);
  const [basic, setBasic] = useState<BasicTextMatchResult | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const runMatch = async () => {
    setError(null);
    setNotice(null);
    setFull(null);
    setBasic(null);
    setAdded(new Set());

    if (isResumeEmpty(formData)) {
      setError("Add résumé content first, then match it to a job.");
      return;
    }
    const jd = jobDesc.trim();
    if (jd.length < MIN_JOB_DESCRIPTION_CHARS) {
      setError(`Paste the full job description (at least ${MIN_JOB_DESCRIPTION_CHARS} characters).`);
      return;
    }

    // Degraded path: a clearly-different basic comparison. Never fabricates
    // required/preferred. If it cannot say anything useful, surface a retryable
    // error instead of manufacturing a score.
    const degrade = (reason: string) => {
      const b = basicTextMatch(formData, jd);
      if (!b) {
        setError(reason + " We also couldn't build a basic text comparison — please try again.");
        return;
      }
      setBasic(b);
      setNotice(reason);
    };

    setLoading(true);
    try {
      const res = await postResumeAI("/api/resume/requirements", { jobDescription: jd });
      const data = (await res.json().catch(() => ({}))) as { requirements?: unknown; error?: string };
      if (res.ok) {
        const requirements = validateRequirements(data.requirements);
        if (requirements) {
          // Full analysis: matching runs locally; the résumé is never sent.
          setFull(matchResumeToJob(formData, requirements));
        } else {
          degrade("We couldn't extract the job's structured requirements.");
        }
      } else if (res.status === 429) {
        degrade("The AI service is rate-limited right now.");
      } else {
        degrade(data.error || "We couldn't analyze the job's requirements right now.");
      }
    } catch {
      degrade("We couldn't reach the AI service.");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (term: string) => {
    const exists = formData.skills.some((s) => s.trim().toLowerCase() === term.trim().toLowerCase());
    if (!exists) onUpdate({ skills: [...formData.skills, term] });
    setAdded((prev) => new Set(prev).add(term.toLowerCase()));
  };

  const fullColor = full
    ? full.overall >= 70 ? "#10b981" : full.overall >= 45 ? "#7c3aed" : "#f59e0b"
    : "#7c3aed";

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{ background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div>
        <h3 className="text-sm font-semibold text-white">Match to a Job</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Paste a job description to see how well your résumé matches it — not a prediction of
          getting hired or passing an ATS.
        </p>
      </div>

      <label htmlFor="jobmatch-jd" className="sr-only">Job description</label>
      <textarea
        id="jobmatch-jd"
        rows={5}
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
        placeholder="Paste the full job description here…"
        disabled={loading}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 resize-none"
      />

      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}

      <button
        type="button"
        onClick={runMatch}
        disabled={loading}
        className="self-start px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #b45309, #f59e0b)" }}
      >
        {loading ? "Analyzing…" : "Analyze Match"}
      </button>

      {/* ── FULL Job Match ────────────────────────────────────────────────── */}
      {full && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold" style={{ color: fullColor }}>{full.overall}%</div>
            <div>
              <p className="text-sm font-medium text-white">Job Match</p>
              <p className="text-xs text-slate-500">How well your résumé matches this job&apos;s requirements.</p>
            </div>
          </div>

          {full.categories.filter((c) => c.matches.length > 0).map((c) => (
            <div key={c.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-40 shrink-0">{c.label}</span>
                <Bar value={c.subScore} max={100} color={fullColor} />
                <span className="text-xs text-slate-500 w-12 text-right shrink-0">{c.subScore}%</span>
              </div>
              <ul className="flex flex-col gap-1 pl-1">
                {c.matches.map((m) => (
                  <EvidenceRow
                    key={m.term}
                    m={m}
                    added={added.has(m.term.toLowerCase())}
                    onAdd={
                      (c.key === "required" || c.key === "preferred") && !m.matched
                        ? () => addSkill(m.term)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))}

          <p className="text-[11px] text-slate-600 leading-relaxed">
            A missing keyword is never added to your résumé automatically. Use &ldquo;Add to Skills&rdquo; only
            for skills you genuinely have.
          </p>
        </div>
      )}

      {/* ── DEGRADED Basic text match (visibly different, lower confidence) ── */}
      {basic && (
        <div
          className="flex flex-col gap-3 rounded-xl p-4"
          aria-live="polite"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px dashed rgba(245,158,11,0.35)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.14)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              Basic text match
            </span>
            <span className="text-[11px] text-slate-500">limited — AI extraction unavailable</span>
          </div>

          {notice && <p className="text-xs text-slate-400">{notice}</p>}

          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t extract the job&apos;s structured requirements. Here&apos;s a limited text
            comparison based on terms found directly in the job description — it is not the full Job
            Match analysis and does not identify required vs preferred skills.
          </p>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: "#fcd34d" }}>{basic.coverage}%</span>
            <span className="text-sm text-slate-300">term coverage</span>
            <span className="text-xs text-slate-500">
              ({basic.matchedCount} of {basic.totalCount} job terms found in your résumé)
            </span>
          </div>

          <ul className="flex flex-col gap-1 pl-1">
            {basic.terms.map((t) => (
              <li key={t.term} className="flex items-center gap-2 text-sm">
                <span className="shrink-0" style={{ color: t.matched ? "#6ee7b7" : "#94a3b8" }}>
                  {t.matched ? "✓" : "○"}
                </span>
                <span className="text-slate-300">{t.term}</span>
                {t.matched && <span className="text-[11px] text-slate-500">found in {t.evidence}</span>}
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Basic mode doesn&apos;t suggest adding skills, since these are raw job terms rather than
            verified requirements. Nothing is added to your résumé.
          </p>

          <button
            type="button"
            onClick={runMatch}
            disabled={loading}
            className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #b45309, #f59e0b)" }}
          >
            {loading ? "Retrying…" : "Try full analysis again"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function ResumeAnalysisPanel({ formData, onUpdate }: Props) {
  return (
    <section className="py-12 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="section-divider flex-1" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">
            Résumé analysis
          </span>
          <div className="section-divider flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <StrengthMode formData={formData} />
          <JobMatchMode formData={formData} onUpdate={onUpdate} />
        </div>
      </div>
    </section>
  );
}
