"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

type BillingPeriod = "weekly" | "monthly" | "yearly";

interface PriceInfo {
  amount: string;
  period: string;
  note: string;
  cta: string;
}

const PRICES: Record<string, Record<BillingPeriod, PriceInfo>> = {
  free: {
    weekly:  { amount: "Free", period: "",        note: "No credit card required",     cta: "Get started free" },
    monthly: { amount: "Free", period: "",        note: "No credit card required",     cta: "Get started free" },
    yearly:  { amount: "Free", period: "",        note: "No credit card required",     cta: "Get started free" },
  },
  pro: {
    weekly:  { amount: "€7.99",  period: "/week",  note: "Billed weekly · Cancel anytime",   cta: "Start free trial — 3 days" },
    monthly: { amount: "€24",    period: "/month", note: "Billed monthly · Cancel anytime",  cta: "Start free trial — 3 days" },
    yearly:  { amount: "€199",   period: "/year",  note: "Billed yearly · Cancel anytime",   cta: "Start free trial — 3 days" },
  },
  team: {
    weekly:  { amount: "€49",    period: "/month", note: "Minimum monthly billing",          cta: "Start team trial" },
    monthly: { amount: "€49",    period: "/month", note: "Billed monthly · Cancel anytime",  cta: "Start team trial" },
    yearly:  { amount: "€399",   period: "/year",  note: "Billed yearly · Cancel anytime",   cta: "Start team trial" },
  },
};

const FREE_FEATURES    = ["1 AI resume per month","3 job matches per day","1 cover letter per month","Basic resume templates","Community support"];
const FREE_MISSING     = ["Unlimited resumes & cover letters","Resume translation","Premium templates","AI interview prep"];
const PRO_FEATURES     = ["Unlimited AI resumes","Unlimited cover letters","Resume translation (30+ languages)","Premium & ATS-friendly templates","AI interview coach","LinkedIn profile optimizer","Career path planner","Priority email support"];
const TEAM_FEATURES    = ["Everything in Pro","Up to 10 team seats","Shared templates library","Bulk resume generation","Team analytics dashboard","Priority support"];

const TOGGLE_OPTIONS: { key: BillingPeriod; label: string; badge?: string }[] = [
  { key: "weekly",  label: "Weekly",  badge: "Flexible" },
  { key: "monthly", label: "Monthly", badge: "Popular" },
  { key: "yearly",  label: "Yearly",  badge: "Save 30%" },
];

export default function Pricing() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const freePrice = PRICES.free[billing];
  const proPrice  = PRICES.pro[billing];
  const teamPrice = PRICES.team[billing];

  return (
    <section id="pricing" className="py-24 relative">
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">Pricing</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple,{" "}
            <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Start free. Upgrade when you&apos;re ready. Cancel anytime — no hidden fees.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div
            className="flex items-center p-1 rounded-xl border gap-0.5"
            style={{ background: "rgba(13,13,22,0.7)", borderColor: "rgba(255,255,255,0.09)" }}
          >
            {TOGGLE_OPTIONS.map((opt) => {
              const isActive = billing === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBilling(opt.key)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                          color: "white",
                          boxShadow: "0 0 16px rgba(124,58,237,0.35)",
                        }
                      : { color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {opt.label}
                  {opt.badge && (
                    <span
                      className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={
                        isActive
                          ? { background: "rgba(255,255,255,0.2)", color: "white" }
                          : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }
                      }
                    >
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Free */}
          <PlanCard
            name="Free"
            description="Try the essentials at no cost."
            priceInfo={freePrice}
            features={FREE_FEATURES}
            missing={FREE_MISSING}
            highlight={false}
            badge={null}
            accentColor="#06b6d4"
          />

          {/* Pro */}
          <PlanCard
            name="Pro"
            description="Everything you need to land your next role."
            priceInfo={proPrice}
            features={PRO_FEATURES}
            missing={[]}
            highlight={true}
            badge="Most popular"
            accentColor="#7c3aed"
          />

          {/* Team */}
          <PlanCard
            name="Team"
            description="For bootcamps, coaches, and hiring teams."
            priceInfo={teamPrice}
            features={TEAM_FEATURES}
            missing={[]}
            highlight={false}
            badge={null}
            accentColor="#06b6d4"
            teamWeeklyNote={billing === "weekly"}
          />
        </div>

        <p className="text-center text-slate-500 text-sm mt-10">
          All paid plans come with a{" "}
          <span className="text-slate-400 font-medium">14-day money-back guarantee.</span>{" "}
          No questions asked.
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  description,
  priceInfo,
  features,
  missing,
  highlight,
  badge,
  accentColor,
  teamWeeklyNote,
}: {
  name: string;
  description: string;
  priceInfo: PriceInfo;
  features: string[];
  missing: string[];
  highlight: boolean;
  badge: string | null;
  accentColor: string;
  teamWeeklyNote?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl p-7 flex flex-col transition-all duration-200"
      style={
        highlight
          ? {
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.35)",
              boxShadow: "0 0 60px rgba(124,58,237,0.15)",
            }
          : {
              background: "rgba(13,13,22,0.6)",
              border: "1px solid rgba(255,255,255,0.07)",
            }
      }
    >
      {badge && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
        >
          {badge}
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-white font-semibold text-lg mb-1">{name}</h3>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{priceInfo.amount}</span>
          {priceInfo.period && (
            <span className="text-slate-500 text-sm">{priceInfo.period}</span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-1">{priceInfo.note}</p>
        {teamWeeklyNote && (
          <p className="text-[11px] text-amber-500/70 mt-1">↑ Minimum monthly plan for teams</p>
        )}
      </div>

      {/* CTA */}
      <a
        href="#"
        className="block text-center py-3 rounded-xl font-semibold text-sm mb-7 mt-4 transition-all duration-200 hover:opacity-90"
        style={
          highlight
            ? {
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                color: "white",
                boxShadow: "0 0 24px rgba(124,58,237,0.35)",
              }
            : {
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
              }
        }
      >
        {priceInfo.cta}
      </a>

      <div className="border-t border-white/[0.06] mb-6" />

      <ul className="flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
            <Check
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: accentColor }}
            />
            {f}
          </li>
        ))}
        {missing.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
            <X size={14} className="mt-0.5 shrink-0 opacity-30" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
