"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        // Listen for the auth state change triggered by the OAuth token in the URL hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
          if (sess) {
            subscription.unsubscribe();
            router.replace("/dashboard");
          }
        });
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d16" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(139,92,246,0.4)", borderTopColor: "#7c3aed" }}
        />
        <p className="text-sm text-slate-400">Signing you in…</p>
      </div>
    </div>
  );
}
