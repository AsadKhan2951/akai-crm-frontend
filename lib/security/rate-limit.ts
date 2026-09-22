import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class RateLimitExceeded extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) { super("Too many requests. Wait a moment and try again."); this.name = "RateLimitExceeded"; this.retryAfterSeconds = retryAfterSeconds; }
}

function bucketHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

async function consume(bucketValue: string, windowSeconds: number, limit: number) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_bucket_key: bucketHash(bucketValue), p_window_seconds: windowSeconds, p_limit: limit });
  if (error || !data?.[0]) throw new Error("Rate limiting is temporarily unavailable. Try again shortly.");
  if (!data[0].allowed) throw new RateLimitExceeded(Number(data[0].retry_after_seconds ?? windowSeconds));
  return { remaining: Number(data[0].remaining ?? 0) };
}

export async function enforceUserRateLimit(scope: string, windowSeconds: number, limit: number) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again.");
  return consume(`user:${user.id}:${scope}`, windowSeconds, limit);
}

export async function enforceRequestRateLimit(request: Request, scope: string, windowSeconds: number, limit: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown-ip";
  return consume(`ip:${ip}:${scope}`, windowSeconds, limit);
}
