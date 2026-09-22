import "server-only";
import { requirePermission } from "@/lib/auth/server";
import { resolveVendorAiProductContext } from "@/lib/catalog/vendor-surface";

type ContextProduct = { id: string; sku: string; name_en: string; name_ur: string; is_quote_only: boolean };

function config() { const apiKey = process.env.ANTHROPIC_API_KEY; const model = process.env.ANTHROPIC_MODEL; return apiKey && model ? { apiKey, model } : null; }

export async function draftVendorAssistant(customerId: string, query: string) {
  await requirePermission("ai.chat"); const products = (await resolveVendorAiProductContext(customerId)) as ContextProduct[]; const needle = query.trim().toLocaleLowerCase("en-US");
  const fallback = products.filter((product) => `${product.sku} ${product.name_en} ${product.name_ur}`.toLocaleLowerCase("en-US").includes(needle)).slice(0, 8).map((product) => product.id);
  const setting = config(); if (!setting || !needle) return { ok: false as const, reason: setting ? "invalid" as const : "unavailable" as const, productIds: fallback };
  const allowed = products.map((product) => ({ id: product.id, sku: product.sku, name: product.name_en, quoteOnly: product.is_quote_only }));
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": setting.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: setting.model, max_tokens: 350, temperature: 0, system: "Return JSON only. You may select IDs only from the supplied allowed list. Never invent a product or state a price, stock, customer, or balance figure.", messages: [{ role: "user", content: JSON.stringify({ request: query.trim(), allowed }) }] }), signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { ok: false as const, reason: "unavailable" as const, productIds: fallback };
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> }; const text = body.content?.find((item) => item.type === "text")?.text ?? ""; const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { productIds?: unknown };
    const ids = Array.isArray(parsed.productIds) ? parsed.productIds.filter((id): id is string => typeof id === "string" && products.some((product) => product.id === id)).slice(0, 8) : [];
    return { ok: true as const, reason: "draft" as const, productIds: ids };
  } catch { return { ok: false as const, reason: "unavailable" as const, productIds: fallback }; }
}
