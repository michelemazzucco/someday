import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Anon key plus the caller's access token. Every query then runs as that user and
 * RLS is the enforcement, so the extension never needs a service role key.
 */
export function createBearerClient(accessToken: string) {
  return createSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}
