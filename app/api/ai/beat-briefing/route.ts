import { requirePermission } from "@/lib/auth/server";
import { generateBeatBriefing } from "@/lib/ai/beat";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
import { beatBriefingRequestSchema, firstValidationMessage } from "@/lib/security/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("ai.chat");
  await requirePermission("beat.view");
  try { await enforceUserRateLimit("ai-beat-briefing", 60, 5); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const parsed = beatBriefingRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  try {
    const result = await generateBeatBriefing(parsed.data.plannedDate, parsed.data.locale);
    return Response.json(result);
  } catch {
    return Response.json({ error: "The briefing could not be prepared. Continue with the visible evidence manually." }, { status: 503 });
  }
}
