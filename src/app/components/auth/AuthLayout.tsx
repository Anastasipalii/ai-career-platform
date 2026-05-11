import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center grid-bg relative overflow-hidden py-12 px-4"
      style={{ background: "#05050a" }}
    >
      {/* Orbs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)" }}
      />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 relative z-10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="9" cy="9" r="2.5" fill="white" />
          </svg>
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">CareerAI</span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm relative z-10 rounded-2xl p-8 border"
        style={{
          background: "rgba(13,13,22,0.85)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 60px rgba(124,58,237,0.08), 0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
