import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client bound to the signed-in user's session.
 * Database reads, writes, and RPC calls go to Supabase Postgres, where Row Level Security
 * is the authoritative access boundary (see PROJECT_RULES.md).
 *
 * One client per request (React cache). `auth.getUser()` is a network call to Supabase Auth,
 * so the first result is shared by every caller in the same request; it resets whenever the
 * session changes (sign-in, sign-out, token refresh).
 */
export const getSupabaseServerClient = cache(async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes them.
        }
      },
    },
  });

  const getUser = client.auth.getUser.bind(client.auth);
  let pending: ReturnType<typeof getUser> | null = null;
  client.auth.getUser = ((jwt?: string) => {
    if (jwt) return getUser(jwt);
    pending ??= getUser().then((result) => {
      if (result.error) pending = null; // do not keep transient failures
      return result;
    });
    return pending;
  }) as typeof client.auth.getUser;
  client.auth.onAuthStateChange((event) => { if (event !== "INITIAL_SESSION") pending = null; });

  return client;
});

/** Alias used by the admin UI kit. */
export const createClient = getSupabaseServerClient;
