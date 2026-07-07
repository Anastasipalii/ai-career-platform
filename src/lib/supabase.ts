import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Required so the OAuth token in the callback URL is parsed into a session.
    detectSessionInUrl: true,
  },
});

// Detects the failures Supabase's background auth refresh can throw when the
// auth endpoint is unreachable ("Failed to fetch") or the token is rejected.
function isSupabaseAuthError(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false;
  const name = (reason as { name?: string }).name ?? "";
  const message = (reason as { message?: string }).message ?? "";
  return (
    name === "AuthRetryableFetchError" ||
    name === "AuthApiError" ||
    /failed to fetch/i.test(message)
  );
}

// All handling below is browser-only and additive — no UI is touched.
if (typeof window !== "undefined") {
  // (1) + (4) Catch auth-refresh fetch failures so the rejected promise does not
  // bubble up as an uncaught rejection and trigger the Next.js error overlay.
  // Auto-refresh retries on its own; we log instead of crashing.
  window.addEventListener("unhandledrejection", (event) => {
    if (isSupabaseAuthError(event.reason)) {
      event.preventDefault();
      const detail =
        (event.reason as { message?: string })?.message ?? String(event.reason);
      console.warn("[supabase] auth refresh failed (handled, not fatal):", detail);
    }
  });

  // (2) + (3) When the session is genuinely signed out — i.e. the refresh token
  // is invalid/expired and could not be recovered — send the user on a
  // protected route to /login. On public routes we simply let the cleared
  // session stand (unauthenticated state). Transient network failures keep the
  // session and never reach here, so a flaky connection won't bounce the user.
  supabase.auth.onAuthStateChange((authEvent) => {
    if (authEvent === "SIGNED_OUT" && window.location.pathname.startsWith("/dashboard")) {
      window.location.assign("/login");
    }
  });

  // On load, clear a persisted-but-invalid session so the app boots clean.
  // Only non-transient errors trigger cleanup (which fires SIGNED_OUT above).
  supabase.auth
    .getSession()
    .then(({ error }) => {
      if (error && error.name !== "AuthRetryableFetchError") {
        supabase.auth.signOut({ scope: "local" }).catch(() => {
          /* best-effort local cleanup */
        });
      }
    })
    .catch(() => {
      /* transient error — leave the persisted session intact */
    });
}
