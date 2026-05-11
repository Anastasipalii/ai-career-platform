import { LinkedInFormData, LinkedInTone } from "@/app/components/linkedin-optimizer/types";

interface LinkedInPreviewProps {
  formData: LinkedInFormData;
  optimized: boolean;
}

const TONE_HEADLINES: Record<LinkedInTone, string> = {
  Professional: "Senior Product Designer | Design Systems · AI Products · UX Leadership",
  Confident:    "Senior Product Designer driving 3× user growth through AI-first design at scale",
  Friendly:     "Product Designer who loves building tools people actually enjoy using ✨",
  Executive:    "VP-track Design Leader | Scaling design orgs & AI products from 0 to 1M users",
  Creative:     "Designer × Storyteller × Builder — crafting AI interfaces that feel like magic",
  Minimal:      "Senior Product Designer. Figma. Systems. AI.",
  Corporate:    "Senior Product Designer | Enterprise UX | Cross-functional Leadership",
};

const TONE_ABOUT: Record<LinkedInTone, string> = {
  Professional:
    "I'm a Senior Product Designer with 6+ years of experience building AI-powered digital products at scale. At Vercel, I led the redesign of the developer dashboard — reducing onboarding time by 40% and improving deployment success rates by 34%. I specialize in design systems, cross-functional collaboration, and translating complex technical requirements into intuitive user experiences.",
  Confident:
    "I build products that move metrics. In 6 years as a designer, I've shipped AI tools used by over 1 million developers, redesigned dashboards that cut onboarding time by 40%, and built design systems from scratch that scaled across 12 product surfaces. I thrive in fast-moving teams where design has a real seat at the table.",
  Friendly:
    "Hey! I'm Alex — a product designer who's been obsessed with making technology feel less intimidating for the past 6 years. I've worked at some pretty cool companies (Vercel, Linear) where I got to design tools that developers actually enjoy using. I love collaborating with engineers and PMs, and I'm happiest when a user says \"this just works.\"",
  Executive:
    "Design leader with 6+ years shaping product strategy and scaling design infrastructure at high-growth startups. Led Vercel's design function across 12 product surfaces, delivering measurable business outcomes including 34% uplift in deployment success rates. Track record of building and mentoring high-performing design teams, defining design-driven cultures, and partnering with C-level stakeholders.",
  Creative:
    "I make software feel human. For 6 years I've been bridging the gap between what engineers build and what users love — at Vercel, at Linear, and everywhere in between. My work lives at the intersection of AI, interaction design, and that moment when someone opens an app and just *gets it* immediately.",
  Minimal:
    "6 years in product design. Vercel, Linear. Design systems, AI products, UX research. Results: 40% faster onboarding, 34% better deployment rates. Open to senior / lead roles.",
  Corporate:
    "Experienced Senior Product Designer with a demonstrated history of delivering enterprise-grade user experiences across SaaS and developer tooling verticals. Proven ability to manage complex design portfolios, align cross-functional stakeholders, and deliver quantifiable improvements to key performance indicators.",
};

const SAMPLE_SKILLS = ["Figma", "UX Research", "Design Systems", "Prototyping", "AI/ML", "React", "Accessibility", "A/B Testing"];

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
  return (
    <div
      style={{
        width: "72px",
        height: "72px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0a66c2, #7c3aed)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
        fontWeight: 700,
        color: "white",
        border: "3px solid white",
        flexShrink: 0,
      }}
    >
      {initials || "AC"}
    </div>
  );
}

export default function LinkedInPreview({ formData, optimized }: LinkedInPreviewProps) {
  const name     = formData.fullName    || "Alexandra Chen";
  const role     = formData.currentRole || "Senior Product Designer";
  const headline = optimized ? TONE_HEADLINES[formData.tone] : (formData.headline || TONE_HEADLINES["Professional"]);
  const about    = optimized ? TONE_ABOUT[formData.tone]    : (formData.about    || TONE_ABOUT["Professional"]);
  const skills   = formData.skills
    ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8)
    : SAMPLE_SKILLS;

  const expLines = formData.experience
    ? formData.experience.split("\n").filter(Boolean)
    : [
        "Senior Product Designer @ Vercel · Mar 2022 – Present",
        "• Led dashboard redesign — 40% onboarding improvement",
        "• Built design system across 12 product surfaces",
        "",
        "Product Designer @ Linear · Jun 2020 – Feb 2022",
        "• Designed core issue tracking features and mobile app",
      ];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live preview</p>
        <div className="flex items-center gap-3">
          {optimized && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              AI optimized
            </div>
          )}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: "rgba(10,102,194,0.12)", border: "1px solid rgba(10,102,194,0.25)", color: "#93c5fd" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0a66c2" }} />
            {formData.tone}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* LinkedIn-style document */}
      <div style={{ background: "#f3f2ef", padding: "12px", maxHeight: "580px", overflowY: "auto" }}>
        <div style={{ background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif", position: "relative" }}>

          {/* Cover photo */}
          <div style={{ height: "100px", background: "linear-gradient(135deg, #0a66c2 0%, #7c3aed 100%)", position: "relative" }}>
            {/* LinkedIn wordmark */}
            <div style={{ position: "absolute", top: "10px", right: "14px", background: "rgba(255,255,255,0.15)", borderRadius: "4px", padding: "3px 8px" }}>
              <span style={{ color: "white", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>in</span>
            </div>
          </div>

          {/* Avatar + name row */}
          <div style={{ padding: "0 20px 16px", position: "relative" }}>
            <div style={{ marginTop: "-36px", marginBottom: "10px" }}>
              <Avatar name={name} />
            </div>

            {/* Name + role */}
            <div style={{ marginBottom: "4px" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#000000e6", lineHeight: 1.2 }}>{name}</div>
            </div>

            {/* Headline */}
            <div style={{ fontSize: "13px", color: "#000000cc", lineHeight: 1.5, marginBottom: "8px" }}>
              {headline}
            </div>

            {/* Location + connections */}
            <div style={{ fontSize: "12px", color: "#00000099", marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <span>San Francisco Bay Area</span>
              <span style={{ color: "#0a66c2", fontWeight: 500 }}>500+ connections</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ background: "#0a66c2", color: "white", padding: "5px 16px", borderRadius: "16px", fontSize: "12px", fontWeight: 600 }}>Connect</div>
              <div style={{ border: "1px solid #0a66c2", color: "#0a66c2", padding: "5px 16px", borderRadius: "16px", fontSize: "12px", fontWeight: 600 }}>Message</div>
            </div>
          </div>

          <div style={{ height: "1px", background: "#e5e7eb", margin: "0 20px" }} />

          {/* About */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "8px" }}>About</div>
            <p style={{ fontSize: "12px", color: "#000000cc", lineHeight: 1.7, margin: 0 }}>{about}</p>
          </div>

          <div style={{ height: "8px", background: "#f3f2ef" }} />

          {/* Experience */}
          <div style={{ padding: "16px 20px", background: "#ffffff" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "10px" }}>Experience</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
              {expLines.map((line, i) =>
                line === "" ? (
                  <div key={i} style={{ height: "8px" }} />
                ) : line.startsWith("•") ? (
                  <div key={i} style={{ fontSize: "11.5px", color: "#000000b3", lineHeight: 1.6, paddingLeft: "10px" }}>{line}</div>
                ) : (
                  <div key={i} style={{ fontSize: "12.5px", fontWeight: 600, color: "#000000e6" }}>{line}</div>
                )
              )}
            </div>
          </div>

          <div style={{ height: "8px", background: "#f3f2ef" }} />

          {/* Skills */}
          <div style={{ padding: "16px 20px", background: "#ffffff" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#000000e6", marginBottom: "10px" }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
              {skills.map((skill) => (
                <span
                  key={skill}
                  style={{ fontSize: "11px", background: "#f3f2ef", color: "#000000cc", padding: "4px 10px", borderRadius: "12px", fontWeight: 500, border: "1px solid #ddd" }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Overlay when not yet optimized */}
          {!optimized && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(3px)",
                borderRadius: "8px",
              }}
            >
              <div style={{ textAlign: "center", padding: "24px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(10,102,194,0.12)", border: "1px solid rgba(10,102,194,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Your optimized profile will appear here</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Fill in your details and click Optimize</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
