"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/app/components/auth/AuthLayout";

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow outline-none";

const inputErrCls =
  "w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all outline-none border-red-500/50";

export default function ForgotPasswordForm() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address"); return; }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthLayout>
      {sent ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center text-center py-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h22v17a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
              <path d="M3 6l11 9 11-9" />
              <path d="M9 14l3 3 7-7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
          <p className="text-sm text-slate-400 mb-1 leading-relaxed">
            We sent a password reset link to
          </p>
          <p className="text-sm font-semibold text-white mb-6">{email}</p>
          <p className="text-xs text-slate-600 mb-6">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => { setSent(false); }}
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              try again
            </button>
            .
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to sign in
          </Link>
        </div>
      ) : (
        /* ── Form state ── */
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Reset your password</h1>
            <p className="text-sm text-slate-400">
              Enter your email and we&apos;ll send you reset instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Email address</label>
              <input
                type="email"
                className={error ? inputErrCls : inputCls}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                boxShadow: loading ? "none" : "0 0 28px rgba(124,58,237,0.35)",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Sending reset link…
                </>
              ) : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
