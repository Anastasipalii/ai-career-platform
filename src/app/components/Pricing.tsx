interface Plan {
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  missing: string[];
  cta: string;
  highlight: boolean;
  badge: string | null;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: 0,
    currency: "€",
    description: "Try the essentials at no cost.",
    features: [
      "1 AI resume per month",
      "3 job matches per day",
      "1 cover letter per month",
      "Basic resume templates",
      "Community support",
    ],
    missing: [
      "Unlimited resumes & cover letters",
      "Resume translation",
      "Premium templates",
      "AI interview prep",
    ],
    cta: "Get started free",
    highlight: false,
    badge: null,
  },
  {
    name: "Pro",
    price: 15,
    currency: "€",
    description: "Everything you need to land your next role.",
    features: [
      "Unlimited AI resumes",
      "Unlimited cover letters",
      "Resume translation (30+ languages)",
      "Premium & ATS-friendly templates",
      "AI interview coach",
      "LinkedIn profile optimizer",
      "Career path planner",
      "Priority email support",
    ],
    missing: [],
    cta: "Start free trial — 7 days",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Team",
    price: 25,
    currency: "€",
    description: "For bootcamps, coaches, and hiring teams.",
    features: [
      "Everything in Pro",
      "Up to 10 team seats",
      "Shared templates library",
      "Bulk resume generation",
      "Team analytics dashboard",
      "Priority support",
    ],
    missing: [],
    cta: "Start team trial",
    highlight: false,
    badge: null,
  },
];

const CheckIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="7.5" fill={color} fillOpacity="0.12" />
    <path d="M4.5 8l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="7.5" fill="rgba(255,255,255,0.04)" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 relative">
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
              Pricing
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple,{" "}
            <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Start free. Upgrade when you&#39;re ready. Cancel anytime — no hidden fees.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl p-7 flex flex-col"
              style={
                plan.highlight
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
              {/* Popular badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan name + description */}
              <div className="mb-5">
                <h3 className="text-white font-semibold text-lg mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.price === 0 ? (
                  <div className="text-4xl font-bold text-white">Free</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-medium text-slate-400">{plan.currency}</span>
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm">/month</span>
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {plan.price === 0 ? "No credit card required" : "Billed monthly · Cancel anytime"}
                </p>
              </div>

              {/* CTA button */}
              <a
                href="#"
                className="block text-center py-3 rounded-xl font-semibold text-sm mb-7 transition-all duration-200 hover:opacity-90"
                style={
                  plan.highlight
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
                {plan.cta}
              </a>

              {/* Divider */}
              <div className="border-t border-white/[0.06] mb-6" />

              {/* Features */}
              <ul className="flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 shrink-0">
                      <CheckIcon color={plan.highlight ? "#7c3aed" : "#06b6d4"} />
                    </span>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5 shrink-0">
                      <XIcon />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Money-back note */}
        <p className="text-center text-slate-500 text-sm mt-10">
          All paid plans come with a{" "}
          <span className="text-slate-400 font-medium">14-day money-back guarantee.</span>{" "}
          No questions asked.
        </p>
      </div>
    </section>
  );
}
