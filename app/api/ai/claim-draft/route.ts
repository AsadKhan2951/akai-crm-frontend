import { requirePermission } from "@/lib/auth/server";
import { generateClaimAiDraft } from "@/lib/ai/claims";
import { claimAiRequestSchema, firstValidationMessage } from "@/lib/security/validation";

export async function POST(request: Request) {
  await requirePermission("claim.view");
  await requirePermission("ai.generate_content");
  const body = await request.json().catch(() => null);
  const parsed = claimAiRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstValidationMessage(parsed.error) }, { status: 400 });
  const result = await generateClaimAiDraft({ ...parsed.data, locale: parsed.data.locale ?? "en" });
  return Response.json(result);
}
