import { requirePermission } from "@/lib/auth/server";
import { searchCatalogueWithAi } from "@/lib/ai/catalogue-search";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
import { catalogueSearchRequestSchema, firstValidationMessage } from "@/lib/security/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("ai.chat");
  try { await enforceUserRateLimit("ai-catalogue-search", 60, 20); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Send a valid JSON catalogue search request." }, { status: 400 }); }
  const parsed = catalogueSearchRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  const { query } = parsed.data;
  try { return Response.json(await searchCatalogueWithAi(query)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The catalogue search could not run." }, { status: 500 }); }
}
