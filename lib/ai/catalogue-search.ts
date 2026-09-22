import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserPermissionKeys } from "@/lib/auth/server";
import { resolveVisibleProducts, type VisibleProduct } from "@/lib/catalog/resolve-visible-products";

type SearchProduct = Pick<VisibleProduct, "id" | "sku" | "name_en" | "name_ur" | "description_en" | "description_ur" | "price_pkr" | "is_quote_only" | "stock_quantity" | "category_id" | "brand_id">;
type SearchResult = { products: SearchProduct[]; source: "ai" | "keyword"; fallback: boolean; timedOut: boolean };

function normalize(value: string) { return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim(); }
function publicProduct(product: SearchProduct): SearchProduct { return { id: product.id, sku: product.sku, name_en: product.name_en, name_ur: product.name_ur, description_en: product.description_en, description_ur: product.description_ur, price_pkr: product.price_pkr, is_quote_only: product.is_quote_only, stock_quantity: product.stock_quantity, category_id: product.category_id, brand_id: product.brand_id }; }

async function allowedProducts() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Your session expired. Log in again before searching the catalogue.");
  const { data: vendor } = await supabase.from("vendor_accounts").select("customer_id").eq("user_id", user.id).maybeSingle();
  if (vendor?.customer_id) return (await resolveVisibleProducts(vendor.customer_id)).map(publicProduct);
  const permissions = await getCurrentUserPermissionKeys();
  if (!permissions.includes("product.view")) throw new Error("You do not have permission to search the catalogue.");
  const { data, error } = await supabase.from("products").select("id,sku,name_en,name_ur,description_en,description_ur,price_pkr,is_quote_only,stock_quantity,category_id,brand_id").eq("is_active", true).order("name_en", { ascending: true }).limit(1000);
  if (error) throw new Error("The catalogue could not be searched. Use the catalogue filters instead.");
  return (data ?? []).map(publicProduct);
}

function keywordSearch(products: SearchProduct[], query: string) {
  const needle = normalize(query);
  if (!needle) return [];
  const terms = needle.split(" ").filter(Boolean);
  return products.map((product) => {
    const haystack = normalize([product.sku, product.name_en, product.name_ur, product.description_en ?? "", product.description_ur ?? ""].join(" "));
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (haystack.startsWith(term) ? 3 : 1) : 0), 0);
    return { product, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.product.name_en.localeCompare(b.product.name_en)).slice(0, 12).map((item) => item.product);
}

async function semanticIds(products: SearchProduct[], query: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return null;
  const allowed = products.map((product) => ({ id: product.id, sku: product.sku, nameEn: product.name_en, nameUr: product.name_ur }));
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 250, temperature: 0, system: "Return JSON only: {productIds:string[]}. Select only IDs from allowedProducts. Handle Urdu, Roman Urdu, spelling mistakes, and common automotive terms. Do not invent products or prices.", messages: [{ role: "user", content: JSON.stringify({ query, allowedProducts: allowed }) }] }), signal: AbortSignal.timeout(3000) });
  if (!response.ok) return null;
  const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.find((item) => item.type === "text")?.text ?? "";
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { productIds?: unknown };
  const allowedIds = new Set(products.map((product) => product.id));
  if (!Array.isArray(parsed.productIds)) return null;
  return parsed.productIds.filter((id): id is string => typeof id === "string" && allowedIds.has(id)).slice(0, 12);
}

export async function searchCatalogueWithAi(query: string): Promise<SearchResult> {
  const clean = query.trim().slice(0, 200);
  const products = await allowedProducts();
  const fallback = keywordSearch(products, clean);
  if (!clean) return { products: [], source: "keyword", fallback: true, timedOut: false };
  try {
    const ids = await semanticIds(products, clean);
    if (!ids) return { products: fallback, source: "keyword", fallback: true, timedOut: false };
    const byId = new Map(products.map((product) => [product.id, product]));
    return { products: ids.map((id) => byId.get(id)).filter((product): product is SearchProduct => Boolean(product)), source: "ai", fallback: false, timedOut: false };
  } catch (error) {
    const timedOut = error instanceof Error && /timed out|abort/i.test(error.message);
    return { products: fallback, source: "keyword", fallback: true, timedOut };
  }
}
