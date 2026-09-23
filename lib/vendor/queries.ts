import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveVisibleProducts, type VisibleProduct } from "@/lib/catalog/resolve-visible-products";
import { compareDecimal } from "@/lib/format/money";

export type NamedEntity = { id: string; name_en: string; name_ur: string; image_url?: string | null; logo_url?: string | null };
export type CatalogueProduct = VisibleProduct & { image_url: string | null; category: NamedEntity | null; brand: NamedEntity | null };
export type StockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function stockState(product: Pick<VisibleProduct, "stock_quantity" | "low_stock_threshold">): StockState {
  if (compareDecimal(product.stock_quantity, "0") <= 0) return "OUT_OF_STOCK";
  if (compareDecimal(product.stock_quantity, product.low_stock_threshold) <= 0) return "LOW_STOCK";
  return "IN_STOCK";
}

export function localName(entity: { name_en?: string | null; name_ur?: string | null } | null | undefined, locale: string) {
  if (!entity) return "";
  return (locale === "ur" ? entity.name_ur || entity.name_en : entity.name_en || entity.name_ur) ?? "";
}

/** The vendor's own customer record (RLS: customers_vendor_self_read). */
export async function getVendorCustomer(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id,business_name,business_name_urdu,current_balance_pkr,credit_limit_pkr,loyalty_points_balance,vendor_group_id")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw new Error("Your account could not be loaded. Refresh and try again.");
  return data;
}

/**
 * Every vendor-facing product list goes through resolveVisibleProducts(customerId).
 * Categories, brands and images are only looked up for products already in that set.
 */
export async function getVendorCatalogue(customerId: string): Promise<CatalogueProduct[]> {
  const supabase = await getSupabaseServerClient();
  const products = await resolveVisibleProducts(customerId, supabase);
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);
  const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))];
  const [images, categories, brands] = await Promise.all([
    supabase.from("product_images").select("product_id,url,is_primary,display_order").in("product_id", ids).order("display_order", { ascending: true }),
    categoryIds.length ? supabase.from("categories").select("id,name_en,name_ur,image_url").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    brandIds.length ? supabase.from("brands").select("id,name_en,name_ur,logo_url").in("id", brandIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (images.error || categories.error || brands.error) throw new Error("The catalogue could not be loaded. Refresh and try again.");
  const imageByProduct = new Map<string, string>();
  for (const row of (images.data ?? []) as Array<{ product_id: string; url: string; is_primary: boolean | null }>) {
    if (row.is_primary || !imageByProduct.has(row.product_id)) imageByProduct.set(row.product_id, row.url);
  }
  const categoryById = new Map(((categories.data ?? []) as NamedEntity[]).map((c) => [c.id, c]));
  const brandById = new Map(((brands.data ?? []) as NamedEntity[]).map((b) => [b.id, b]));
  return products.map((p) => ({
    ...p,
    image_url: imageByProduct.get(p.id) ?? null,
    category: categoryById.get(p.category_id) ?? null,
    brand: p.brand_id ? brandById.get(p.brand_id) ?? null : null,
  }));
}

export async function getVendorProduct(customerId: string, productId: string) {
  const catalogue = await getVendorCatalogue(customerId);
  const product = catalogue.find((p) => p.id === productId);
  if (!product) return null;
  const supabase = await getSupabaseServerClient();
  const { data: images } = await supabase
    .from("product_images")
    .select("id,url,alt_text_en,alt_text_ur,is_primary,display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });
  return { product, images: (images ?? []) as Array<{ id: string; url: string; alt_text_en: string | null; alt_text_ur: string | null; is_primary: boolean | null }> };
}

export type VendorCartLine = { id: string; product_id: string; quantity: string; unit_price_pkr: string; name_en: string; name_ur: string; sku: string; is_quote_only: boolean };

/** Reads the active cart only. Carts are created by add_vendor_cart_line. */
export async function getVendorCart(customerId: string) {
  const supabase = await getSupabaseServerClient();
  // Drop lines the vendor can no longer see before showing the cart.
  const removed = await supabase.rpc("remove_invisible_cart_lines", { p_customer_id: customerId });
  const { data: cart, error } = await supabase
    .from("carts")
    .select("id,requires_price_review,last_priced_at")
    .eq("customer_id", customerId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (error) throw new Error("Your cart could not be loaded. Refresh and try again.");
  if (!cart) return { cart: null, lines: [] as VendorCartLine[], totals: null, priceChanges: [], removedCount: Number(removed.data ?? 0) };
  const [lines, totals, changes] = await Promise.all([
    supabase.from("cart_lines").select("id,product_id,quantity,unit_price_pkr,product:products(name_en,name_ur,sku,is_quote_only)").eq("cart_id", cart.id).order("created_at", { ascending: true }),
    supabase.rpc("vendor_cart_totals", { p_cart_id: cart.id }),
    supabase.from("cart_price_changes").select("id,product_id,old_unit_price_pkr,new_unit_price_pkr,detected_at").eq("cart_id", cart.id).is("acknowledged_at", null),
  ]);
  if (lines.error || totals.error || changes.error) throw new Error("Your cart could not be loaded. Refresh and try again.");
  const normalized: VendorCartLine[] = (lines.data ?? []).map((row) => {
    const product = (Array.isArray(row.product) ? row.product[0] : row.product) as { name_en?: string; name_ur?: string; sku?: string; is_quote_only?: boolean } | null;
    return { id: row.id, product_id: row.product_id, quantity: String(row.quantity), unit_price_pkr: String(row.unit_price_pkr), name_en: product?.name_en ?? "", name_ur: product?.name_ur ?? "", sku: product?.sku ?? "", is_quote_only: Boolean(product?.is_quote_only) };
  });
  const totalRow = (totals.data ?? [])[0] as { line_count: number; item_quantity: string; subtotal_pkr: string; requires_price_review: boolean } | undefined;
  return { cart, lines: normalized, totals: totalRow ?? null, priceChanges: changes.data ?? [], removedCount: Number(removed.data ?? 0) };
}

export async function getVendorOrders(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,status,total_pkr,placed_at,payment_method,approval_required")
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Your orders could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getVendorOrder(customerId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,status,total_pkr,subtotal_pkr,discount_pkr,points_redeemed,points_discount_pkr,points_earned,placed_at,approved_at,confirmed_at,delivered_at,payment_method,approval_required,rejection_reason,notes")
    .eq("customer_id", customerId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error("This order could not be loaded. Refresh and try again.");
  if (!order) return null;
  const { data: lines } = await supabase
    .from("order_lines")
    .select("id,quantity,unit_price_pkr,line_total_pkr,is_free_item,product:products(name_en,name_ur,sku)")
    .eq("order_id", orderId);
  return { order, lines: (lines ?? []).map((l) => ({ ...l, product: (Array.isArray(l.product) ? l.product[0] : l.product) as { name_en?: string; name_ur?: string; sku?: string } | null })) };
}

export async function getVendorQuotes(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id,quote_number,status,total_pkr,created_at,valid_until,converted_order_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Your quotes could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getVendorQuote(customerId: string, quoteId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id,quote_number,status,total_pkr,created_at,valid_until,customer_notes,quoted_at,responded_at,rejection_reason,converted_order_id")
    .eq("customer_id", customerId)
    .eq("id", quoteId)
    .maybeSingle();
  if (error) throw new Error("This quote could not be loaded. Refresh and try again.");
  if (!quote) return null;
  const { data: lines } = await supabase
    .from("quote_lines")
    .select("id,quantity,requested_notes,quoted_unit_price_pkr,line_total_pkr,product:products(name_en,name_ur,sku)")
    .eq("quote_id", quoteId);
  return { quote, lines: (lines ?? []).map((l) => ({ ...l, product: (Array.isArray(l.product) ? l.product[0] : l.product) as { name_en?: string; name_ur?: string; sku?: string } | null })) };
}

export async function getVendorLedger(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("id,type,amount_pkr,reference_number,description,entry_date")
    .eq("customer_id", customerId)
    .order("entry_date", { ascending: false })
    .limit(200);
  if (error) throw new Error("Your ledger could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getVendorHome(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const [banners, reorders] = await Promise.all([
    supabase.rpc("resolve_visible_banners", { p_customer_id: customerId }),
    supabase.rpc("vendor_reorder_products", { p_customer_id: customerId, p_limit: 5 }),
  ]);
  return {
    banners: (banners.error ? [] : banners.data ?? []).slice(0, 5) as Array<{ id: string; title_en: string; title_ur: string; subtitle_en: string | null; subtitle_ur: string | null; image_url: string | null; image_url_ur: string | null; link_type: string; link_target_id: string | null; external_url: string | null; cta_type: string }>,
    reorders: (reorders.error ? [] : reorders.data ?? []) as Array<{ product_id: string; name_en: string; name_ur: string; times_ordered: number; total_quantity: string; last_ordered_at: string }>,
  };
}
