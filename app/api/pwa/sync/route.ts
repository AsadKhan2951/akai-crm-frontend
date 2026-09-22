import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { enforceRequestRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
import { firstValidationMessage, offlineSyncRequestSchema } from "@/lib/security/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("pwa.sync");
  try { await enforceRequestRateLimit(request, "pwa-sync", 60, 30); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Send a valid offline sync request." }, { status: 400 }); }
  const parsed = offlineSyncRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  const { idempotencyKey, kind, payload } = parsed.data;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("process_offline_operation", { p_idempotency_key: idempotencyKey, p_operation_kind: kind, p_payload: payload });
  if (error) return Response.json({ error: "The offline work could not sync. It remains queued for another attempt." }, { status: 409 });
  return Response.json({ result: data, synced: true });
}
