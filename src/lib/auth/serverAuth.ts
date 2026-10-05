// ============================================================================
// auth/serverAuth — SERVER-SIDE verification of the caller's Supabase session.
//
// The browser client (src/lib/supabase.ts) holds a Supabase session; the shared
// client transport (src/lib/auth/authedFetch.ts) sends its access token as an
// `Authorization: Bearer <jwt>` header. Here, on the server, we VERIFY that JWT
// with Supabase Auth and derive the authenticated user from it.
//
// Hard rules:
//   - NEVER trust body.user_id / query user_id / any client-asserted identity.
//   - NEVER use SUPABASE_SERVICE_ROLE_KEY (none exists in this project); the anon
//     key is sufficient to call auth.getUser(jwt), which validates server-side.
//   - Verification failure / absent token → caller is unauthenticated (null).
//
// The token verifier is injectable so the decision logic is unit-testable
// offline, without a live Supabase connection.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/** Extract a bearer token from the Authorization header. Returns null if absent/malformed. */
export function extractBearerToken(req: { headers: { get(name: string): string | null } }): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/** Verifies a raw JWT and resolves the user it belongs to, or null if invalid. */
export type TokenVerifier = (token: string) => Promise<AuthedUser | null>;

let cachedVerifier: TokenVerifier | null = null;

/** Default verifier: validates the JWT against Supabase Auth using the anon key. */
function defaultVerifier(): TokenVerifier {
  if (cachedVerifier) return cachedVerifier;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Misconfiguration: fail closed (treat everyone as unauthenticated) rather
    // than throwing a 500 that leaks config state.
    cachedVerifier = async () => null;
    return cachedVerifier;
  }
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  cachedVerifier = async (token: string) => {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  };
  return cachedVerifier;
}

/**
 * Resolve the authenticated user for a request, or null if unauthenticated.
 * `verifier` is injectable for tests; production uses the Supabase verifier.
 */
export async function authenticate(
  req: { headers: { get(name: string): string | null } },
  verifier: TokenVerifier = defaultVerifier(),
): Promise<AuthedUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await verifier(token);
  } catch {
    // Any verification error (network, invalid token) → unauthenticated.
    return null;
  }
}

/** TEST-ONLY: override the default verifier. */
export function __setDefaultVerifier(v: TokenVerifier | null): void {
  cachedVerifier = v;
}
