"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/app/components/auth/AuthLayout";
import { supabase } from "@/lib/supabase";

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all input-glow outline-none";

const inputErrCls =
  "w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all outline-none border-red-500/50";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0010 10" />
      <path d="M4.2 4.2C2.5 5.3 1 8 1 8s2.5 5 7 5a7 7 0 003.8-1.2M7 3.1A7 7 0 0115 8s-.7 1.4-1.8 2.6" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.963L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [agreed, setAgreed]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password && confirmPass && password !== confirmPass) e.confirmPass = "Passwords do not match";
    if (!confirmPass) e.confirmPass = "Please confirm your password";
    if (!agreed) e.agreed = "You must agree to the Terms and Privacy Policy";
    return e;
  };

  const clearError = (key: string) =>
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setErrors({ email: error.message });
      return;
    }
    router.push("/dashboard");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setErrors({ email: error.message });
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Create your account</h1>
        <p className="text-sm text-slate-400">
          Start building better resumes, cover letters, and career plans with AI.
        </p>
      </div>

      {/* Google — coming soon */}
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border text-sm font-medium text-slate-600 cursor-not-allowed mb-5"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        title="Google sign-in coming soon"
      >
        <GoogleIcon />
        Continue with Google
        <span
          className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
        >
          Soon
        </span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        <span className="text-xs text-slate-600">or</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Full name */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Full name</label>
          <input
            type="text"
            className={errors.fullName ? inputErrCls : inputCls}
            placeholder="Emma Wilson"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
          />
          {errors.fullName && <p className="text-xs text-red-400 mt-1.5">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Email address</label>
          <input
            type="email"
            className={errors.email ? inputErrCls : inputCls}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
          />
          {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className={(errors.password ? inputErrCls : inputCls) + " pr-11"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <EyeIcon open={showPass} />
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password}</p>}
          {/* Strength hint */}
          {password.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{
                    background: password.length >= i * 3
                      ? (password.length >= 12 ? "#10b981" : password.length >= 8 ? "#f59e0b" : "#ef4444")
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
              <span className="text-[10px] text-slate-600 ml-1">
                {password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Weak"}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className={(errors.confirmPass ? inputErrCls : inputCls) + " pr-11"}
              placeholder="Repeat your password"
              value={confirmPass}
              onChange={(e) => { setConfirmPass(e.target.value); clearError("confirmPass"); }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {errors.confirmPass && <p className="text-xs text-red-400 mt-1.5">{errors.confirmPass}</p>}
        </div>

        {/* Agreement */}
        <div>
          <label htmlFor="agree-terms" className="flex items-start gap-2.5 cursor-pointer select-none">
            {/* Hidden native checkbox — makes the whole label clickable */}
            <input
              id="agree-terms"
              type="checkbox"
              className="sr-only"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); clearError("agreed"); }}
            />
            {/* Custom visual checkbox */}
            <div
              aria-hidden="true"
              className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150 mt-0.5 shrink-0"
              style={{
                background: agreed ? "#7c3aed" : "rgba(255,255,255,0.05)",
                border: errors.agreed
                  ? "1px solid rgba(239,68,68,0.5)"
                  : agreed
                  ? "1px solid #7c3aed"
                  : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {agreed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs text-slate-400 leading-relaxed">
              I agree to the{" "}
              <span className="text-violet-400 hover:text-violet-300">Terms of Service</span>
              {" "}and{" "}
              <span className="text-violet-400 hover:text-violet-300">Privacy Policy</span>
            </span>
          </label>
          {errors.agreed && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
              {errors.agreed}
            </p>
          )}
        </div>

        {/* Submit — disabled until terms accepted */}
        <button
          type="submit"
          disabled={loading || googleLoading || !agreed}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-1"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: loading || !agreed ? "none" : "0 0 28px rgba(124,58,237,0.35)",
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Creating account…
            </>
          ) : "Create Account"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
