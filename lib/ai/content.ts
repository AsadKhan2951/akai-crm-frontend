import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AiLocale } from "./context";

export const CONTENT_TYPES = ["productDescription", "urduProductName", "categoryDescription", "bannerCopy", "priceAnnouncement", "schemeCopy", "roleSuggestion", "followup"] as const;
export type ContentType = typeof CONTENT_TYPES[number];

type DraftInput = { type: ContentType; locale: AiLocale; instruction: string; productId?: string; priceListId?: string; schemeId?: string };

function fallback(locale: AiLocale, type: ContentType, instruction: string) {
  if (type === "urduProductName" && locale === "ur") return instruction.trim() || "Urdu product name review required";
  if (type === "followup") return instruction.trim() || (locale === "ur" ? "براہ کرم follow-up message کو review کریں۔" : "Please review this follow-up message before sending.");
  return instruction.trim() || (locale === "ur" ? "مسودہ دستیاب نہیں ہے۔ براہ کرم manually مکمل کریں۔" : "No draft was generated. Complete this field manually.");
}

async function evidenceFor(input: DraftInput) {
  const supabase = await getSupabaseServerClient();
  const evidence: Record<string, unknown> = {};
  const trace: string[] = [];
  if (input.productId) {
    const { data: product, error } = await supabase.from("products").select("id,sku,name_en,name_ur,description_en,description_ur,category_id,brand_id,is_active").eq("id", input.productId).maybeSingle();
    if (error) throw new Error("The permitted product could not be loaded for this draft.");
    if (product) { evidence.product = product; trace.push("products.select.current_user_rls"); }
  }
  if (input.priceListId) {
    const { data: priceList, error: priceListError } = await supabase.from("price_lists").select("id,name,effective_from,status").eq("id", input.priceListId).maybeSingle();
    if (priceListError) throw new Error("The permitted price list could not be loaded for this draft.");
    if (priceList) {
      const { data: items, error: itemError } = await supabase.from("price_list_items").select("product_id,price_pkr").eq("price_list_id", input.priceListId).limit(1000);
      if (itemError) throw new Error("Price list items could not be loaded for this draft.");
      const productIds = (items ?? []).map((item) => item.product_id);
      const { data: products, error: productError } = productIds.length ? await supabase.from("products").select("id,sku,name_en,name_ur").in("id", productIds) : { data: [], error: null };
      if (productError) throw new Error("Price list products could not be loaded for this draft.");
      evidence.priceList = { ...priceList, items: items ?? [], products: products ?? [] };
      trace.push("price_lists.select.current_user_rls", "price_list_items.select.current_user_rls", "products.select.current_user_rls");
    }
  }
  if (input.schemeId) {
    const { data: scheme, error: schemeError } = await supabase.from("schemes").select("id,name_en,name_ur,description_en,description_ur,scheme_type,scope_type,scope_ids,terms_en,terms_ur,starts_at,ends_at").eq("id", input.schemeId).maybeSingle();
    if (schemeError) throw new Error("The permitted scheme could not be loaded for this draft.");
    const { data: tiers, error: tierError } = await supabase.from("scheme_tiers").select("min_quantity,min_value_pkr,free_product_id,free_quantity,discount_percent,discount_amount_pkr,display_order").eq("scheme_id", input.schemeId).order("display_order");
    if (tierError) throw new Error("Scheme tiers could not be loaded for this draft.");
    evidence.scheme = { scheme, tiers: tiers ?? [] };
    trace.push("schemes.select.current_user_rls", "scheme_tiers.select.current_user_rls");
  }
  return { evidence, trace };
}

export async function generateContentDraft(input: DraftInput) {
  const { evidence, trace } = await evidenceFor(input);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  const system = `Return JSON only: {draft:string}. Create an editable ${input.type} draft in ${input.locale === "ur" ? "genuine Urdu, keeping common Karachi business English terms natural" : "English"}. This is draft-only: never say that anything was sent, saved, approved, or changed. Use only supplied evidence and instruction. Never invent a figure, customer fact, price, date, or product. If evidence is missing, say that the data is not available. Keep the output concise.`;
  const request = { instruction: input.instruction.trim().slice(0, 4000), evidence, trace };
  if (!apiKey || !model) return { draft: fallback(input.locale, input.type, input.instruction), source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 700, temperature: 0.2, system, messages: [{ role: "user", content: JSON.stringify(request) }] }), signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { draft: fallback(input.locale, input.type, input.instruction), source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const text = body.content?.find((item) => item.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { draft?: unknown };
    if (typeof parsed.draft !== "string" || !parsed.draft.trim()) throw new Error("Empty draft");
    return { draft: parsed.draft.trim(), source: "ai" as const, draftOnly: true, evidenceTrace: trace };
  } catch {
    return { draft: fallback(input.locale, input.type, input.instruction), source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
  }
}
