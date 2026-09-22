import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export function requireCronSecret(request: Request) {
  const expected = [process.env.CRON_SECRET, process.env.ADMIN_CRON_SECRET].filter((value): value is string => Boolean(value));
  const authorization = request.headers.get("authorization");
  const actual = request.headers.get("x-admin-cron-secret") ?? (authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null);
  if (!actual || !expected.includes(actual)) throw new Error("Unauthorized");
}

/** Privileged client for protected cron/system jobs only. Never import this from browser code. */
export function getSystemSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("System-job Supabase configuration is missing.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
