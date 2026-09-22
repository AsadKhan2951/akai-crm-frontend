import { requirePermission } from "@/lib/auth/server";
import { streamAiChat } from "@/lib/ai/engine";
import { AiLimitError } from "@/lib/ai/limits";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
import { aiChatRequestSchema, firstValidationMessage } from "@/lib/security/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("ai.chat");
  try { await enforceUserRateLimit("ai-chat", 60, 10); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Send a valid JSON AI request." }, { status: 400 }); }
  const parsed = aiChatRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  const { message, surface, conversationId, locale } = parsed.data;
  if (surface === "ANALYTICS") await requirePermission("ai.analytics");
  try {
    return await streamAiChat({ message, surface, conversationId, locale });
  } catch (error) {
    if (error instanceof AiLimitError) return Response.json({ error: error.message, code: error.code, limit: error.limit }, { status: 429 });
    const messageText = error instanceof Error ? error.message : "The AI request could not be completed. Try again shortly.";
    return Response.json({ error: messageText }, { status: 500 });
  }
}
