// ============================================================================
// simulation/adminAccess — server-enforced admin gate for the simulation UI
// ----------------------------------------------------------------------------
// Authorization is enforced by the DATABASE, not the client. public.app_admins
// has a single SELECT policy `using (public.is_admin())`, so a non-admin's
// query returns ZERO rows no matter what the browser sends — the admin flag
// cannot be forged client-side. A returned row means the DB itself confirms the
// current user is an admin. No secrets, no service-role key; this uses the
// existing authenticated browser session and respects RLS.
//
// NOTE: the Supabase client is imported lazily (dynamic import) inside the
// browser-only helpers so the pure resolver can be unit-tested without
// initializing the client (which requires NEXT_PUBLIC_SUPABASE_* env vars).
// ============================================================================

export interface AdminAccess {
  userId: string | null;
  isAdmin: boolean;
}

/** Pure resolver — dependencies are injected so this is unit-testable. Any
 *  error resolves to "not admin" (fail closed), never throws. */
export async function resolveAdminAccess(deps: {
  getUserId: () => Promise<string | null>;
  isUserAdmin: (userId: string) => Promise<boolean>;
}): Promise<AdminAccess> {
  let userId: string | null = null;
  try {
    userId = await deps.getUserId();
  } catch {
    userId = null;
  }
  if (!userId) return { userId: null, isAdmin: false };

  let isAdmin = false;
  try {
    isAdmin = await deps.isUserAdmin(userId);
  } catch {
    isAdmin = false; // fail closed
  }
  return { userId, isAdmin };
}

/** Supabase-backed dependencies using the existing authenticated browser client. */
export function supabaseAdminDeps() {
  return {
    getUserId: async (): Promise<string | null> => {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getSession();
      return data.session?.user.id ?? null;
    },
    // RLS on app_admins gates this: non-admins get 0 rows, admins get their row.
    isUserAdmin: async (userId: string): Promise<boolean> => {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
  };
}

// Per-user cache of the app_admins result. The Navbar re-checks admin on every
// auth-state change; without this the app_admins table is queried repeatedly
// (and each query is a 404 when that table isn't present), spamming the network
// log. Cached per userId for the session; a read error caches "not admin" so we
// never re-request a missing/failing table.
const _adminCache = new Map<string, boolean>();

/** Clear the cached admin decision (e.g. on explicit sign-out). */
export function invalidateAdminCache(): void {
  _adminCache.clear();
}

/** Resolve the current session's admin access against the real database. */
export function checkAdminAccess(): Promise<AdminAccess> {
  const deps = supabaseAdminDeps();
  return resolveAdminAccess({
    getUserId: deps.getUserId,
    isUserAdmin: async (userId: string): Promise<boolean> => {
      if (_adminCache.has(userId)) return _adminCache.get(userId)!;
      const isAdmin = await deps.isUserAdmin(userId);
      _adminCache.set(userId, isAdmin);
      return isAdmin;
    },
  });
}
