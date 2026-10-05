// ============================================================================
// auth/authedFetch — the ONE place client code attaches the Supabase session to
// an API request. Every call to a guarded /api route must go through this (or a
// wrapper that delegates to it) so the server auth helper can verify the caller.
//
// It reads the current access token from the browser Supabase client and sets
// `Authorization: Bearer <jwt>`. No token logic is duplicated in components.
// It never sends the user id in the body for auth — identity is the verified JWT.
// ============================================================================

/** Current Supabase access token, or null when there is no live session.
 *  The Supabase client is imported lazily so merely importing this transport
 *  (e.g. in a unit test) never constructs the browser client. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * fetch() that carries the caller's Supabase session as a bearer token.
 * Preserves any caller-supplied init (method, body, signal, headers). When there
 * is no session the request is sent without a token and the server returns 401,
 * which the UI surfaces as a sign-in prompt (no fake success is produced).
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
