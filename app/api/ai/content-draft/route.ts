import { requirePermission } from "@/lib/auth/server";
import { generateContentDraft } from "@/lib/ai/content";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
import { contentDraftRequestSchema, firstValidationMessage } from "@/lib/security/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("ai.generate_content");
  try { await enforceUserRateLimit("ai-content-draft", 60, 10); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Send a valid JSON draft request." }, { status: 400 }); }
  const parsed = contentDraftRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  const { type, instruction, productId, priceListId, schemeId } = parsed.data;
  const locale = parsed.data.locale ?? "en";
  if (type === "priceAnnouncement" && !priceListId) return Response.json({ error: "Choose a price list so every price in the announcement can be traced to a database query." }, { status: 400 });
  if (type === "schemeCopy" && !schemeId) return Response.json({ error: "Choose a scheme so the draft can use its actual mechanics." }, { status: 400 });
  try { return Response.json(await generateContentDraft({ type, locale, instruction, productId, priceListId, schemeId })); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The draft could not be generated. Complete the form manually." }, { status: 500 }); }
}
