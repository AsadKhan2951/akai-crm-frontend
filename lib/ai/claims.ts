import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AiLocale } from "./context";

type ClaimAiTask = "PHOTO_ASSESSMENT" | "DUPLICATE_PATTERN" | "ROOT_CAUSE";

function fallback(task: ClaimAiTask, locale: AiLocale) {
  if (locale === "ur") {
    if (task === "PHOTO_ASSESSMENT") return "Photo assessment دستیاب نہیں۔ Reviewer کو photo اور بیان manually compare کرنا ہوگا۔";
    if (task === "DUPLICATE_PATTERN") return "Duplicate یا unusual pattern کی تصدیق کے لیے claim history manually review کریں۔";
    return "Root-cause grouping کے لیے کافی verified data موجود نہیں۔";
  }
  if (task === "PHOTO_ASSESSMENT") return "Photo assessment is unavailable. The reviewer must compare the photos with the stated cause manually.";
  if (task === "DUPLICATE_PATTERN") return "Review the claim history manually to confirm duplicate photos or an unusual dealer pattern.";
  return "There is not enough verified data for root-cause grouping.";
}

export async function generateClaimAiDraft(input: { claimId: string; task: ClaimAiTask; locale: AiLocale }) {
  const supabase = await getSupabaseServerClient();
  const { data: claim, error: claimError } = await supabase.from("claims").select("id,claim_number,claim_type,status,description,created_at,customer:customers(business_name),lines:claim_lines(quantity,batch_or_serial,reason_notes,product:products(sku,name_en)),photos:claim_photos(url,caption)").eq("id", input.claimId).maybeSingle();
  if (claimError || !claim) throw new Error("The permitted claim could not be loaded for this draft.");
  const [{ data: duplicateRows, error: duplicateError }, { data: patternRows, error: patternError }, { data: rootRows, error: rootError }] = await Promise.all([
    supabase.rpc("claim_photo_duplicate_candidates", { p_claim_id: input.claimId }),
    supabase.rpc("claim_pattern_summary", { p_claim_id: input.claimId }),
    supabase.rpc("claim_root_cause_groups", { p_claim_id: input.claimId }),
  ]);
  if (duplicateError || patternError || rootError) throw new Error("Claim evidence could not be loaded for this draft.");
  const evidence = { claim, duplicatePhotoCandidates: input.task === "DUPLICATE_PATTERN" ? duplicateRows ?? [] : [], dealerPattern: input.task === "DUPLICATE_PATTERN" ? patternRows ?? [] : [], rootCauseGroups: input.task === "ROOT_CAUSE" ? rootRows ?? [] : [] };
  const trace = ["claims.select.current_user_rls", "claim_lines.select.current_user_rls", "claim_photos.select.current_user_rls", "claim_photo_duplicate_candidates.current_user_rls", "claim_pattern_summary.current_user_rls", "claim_root_cause_groups.current_user_rls"];
  const fallbackDraft = { draft: fallback(input.task, input.locale), source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return fallbackDraft;
  const system = `Return JSON only: {draft:string,flags:string[]}. You are a claims review assistant. Create a concise draft suggestion for a human reviewer in ${input.locale === "ur" ? "genuine Urdu, keeping common Karachi business English terms natural" : "English"}. This is draft-only and must never approve, reject, resolve, refund, create an order, or contact anyone. Use only the supplied RLS-scoped evidence. Any number or factual statement must be present in the evidence. If evidence is insufficient, say so. Flags are suggestions for human review, not decisions.`;
  const text = JSON.stringify({ task: input.task, evidence });
  const content: Array<Record<string, unknown>> = [{ type: "text", text }];
  if (input.task === "PHOTO_ASSESSMENT" && Array.isArray((claim as { photos?: unknown[] }).photos)) {
    for (const photo of (claim as { photos: Array<{ url?: string }> }).photos.slice(0, 5)) if (photo.url) content.push({ type: "image", source: { type: "url", url: photo.url } });
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 700, temperature: 0.1, system, messages: [{ role: "user", content }] }), signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallbackDraft;
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const raw = body.content?.find((item) => item.type === "text")?.text ?? "";
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as { draft?: unknown; flags?: unknown };
    if (typeof parsed.draft !== "string" || !parsed.draft.trim() || !Array.isArray(parsed.flags)) return fallbackDraft;
    return { draft: parsed.draft.trim(), flags: parsed.flags.filter((flag): flag is string => typeof flag === "string").slice(0, 10), source: "ai" as const, draftOnly: true, evidenceTrace: trace };
  } catch {
    return fallbackDraft;
  }
}
