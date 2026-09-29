import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClaimProductOption = { id: string; label: string };
export type ClaimOrderOption = { id: string; label: string; productIds: string[] };

type ProductRow = { id: string; sku: string | null; name_en: string | null };
const productLabel = (p: ProductRow) => `${p.name_en ?? p.sku ?? p.id}${p.sku ? ` · ${p.sku}` : ""}`;

/**
 * Choices for the claim form: the customer's recent orders (with their products) and a product list.
 * Products come from the customer's orders first; when they have none, the visible catalogue is used.
 * RLS decides what the current user can see, so dealers only get their own orders.
 */
export async function getClaimFormOptions(customerId: string): Promise<{ orders: ClaimOrderOption[]; products: ClaimProductOption[] }> {
  const supabase = await getSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,created_at,lines:order_lines(product_id,product:products(id,sku,name_en))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(30);

  const products = new Map<string, ClaimProductOption>();
  const orderOptions: ClaimOrderOption[] = (orders ?? []).map((order) => {
    const lines = (order.lines ?? []) as unknown as Array<{ product_id: string; product: ProductRow | null }>;
    lines.forEach((line) => { if (line.product && !products.has(line.product_id)) products.set(line.product_id, { id: line.product_id, label: productLabel(line.product) }); });
    const date = String(order.created_at ?? "").slice(0, 10);
    return { id: order.id, label: `${order.order_number ?? order.id.slice(0, 8)} · ${date}`, productIds: [...new Set(lines.map((l) => l.product_id))] };
  });

  if (products.size === 0) {
    const { data: catalogue } = await supabase.from("products").select("id,sku,name_en").eq("is_active", true).order("name_en").limit(500);
    (catalogue ?? []).forEach((p) => products.set(p.id, { id: p.id, label: productLabel(p as ProductRow) }));
  }
  return { orders: orderOptions, products: [...products.values()].sort((a, b) => a.label.localeCompare(b.label)) };
}

/** Claim photos are private storage paths; turn them into short-lived links for display. */
export async function withSignedClaimPhotos<T extends { photos?: unknown }>(claims: T[]): Promise<T[]> {
  const paths = claims.flatMap((c) => (Array.isArray(c.photos) ? c.photos : []) as Array<{ url?: string }>).map((p) => p.url ?? "").filter((u) => u && !/^https?:\/\//.test(u));
  if (!paths.length) return claims;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.storage.from("claim-photos").createSignedUrls([...new Set(paths)], 60 * 60);
  const signed = new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]));
  return claims.map((c) => ({
    ...c,
    photos: Array.isArray(c.photos) ? (c.photos as Array<{ url?: string }>).map((p) => ({ ...p, url: p.url && signed.has(p.url) ? signed.get(p.url) : p.url })) : c.photos,
  }));
}
