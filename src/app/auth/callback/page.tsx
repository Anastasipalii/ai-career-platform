"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    // Defer navigation to the next tick so the App Router is fully initialized
    // before an action is dispatched. Calling router.replace synchronously from
    // an auth callback (which can fire immediately) triggers
    // "Router action dispatched before initialization".
    const go = (path: string) => {
      if (!active) return;
      active = false;
      subscription?.unsubscribe();
      if (fallback) clearTimeout(fallback);
      setTimeout(() => router.replace(path), 0);
    };

    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          go("/dashboard");
          return;
        }

        // Wait for the auth state change triggered by the OAuth token in the URL.
        const { data } = supabase.auth.onAuthStateChange((_event, sess) => {
          if (sess) go("/dashboard");
        });
        subscription = data.subscription;

        // Fail safe: if no session materializes, send the user to /login
        // instead of hanging on the spinner forever.
        fallback = setTimeout(() => go("/login"), 8000);
      } catch {
        go("/login");
      }
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
      if (fallback) clearTimeout(fallback);
    };
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
