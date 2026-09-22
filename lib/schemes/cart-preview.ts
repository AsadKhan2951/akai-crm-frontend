import "server-only";

import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { evaluateTradeSchemes, type SchemeCartLine, type SchemeProduct } from "./evaluator";
import { getVisibleVendorSchemes } from "./queries";

export async function previewCurrentVendorCartSchemes() {
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) throw new Error("Your Vendor account is not configured. Ask an AKAI administrator to link it.");
  const supabase = await getSupabaseServerClient();
  const { data: cart, error: cartError } = await supabase.from("carts").select("id").eq("customer_id", customerId).eq("status", "ACTIVE").maybeSingle();
  if (cartError) throw new Error("Your cart could not be loaded. Refresh and try again.");
  if (!cart) return { benefits: [], nearlyUnlocked: [], skipped: [] };
  const { data: lines, error: linesError } = await supabase.from("cart_lines").select("product_id,quantity,unit_price_pkr").eq("cart_id", cart.id);
  if (linesError) throw new Error("Your cart lines could not be loaded. Refresh and try again.");
  const productIds = (lines ?? []).map((line) => line.product_id);
  if (!productIds.length) return { benefits: [], nearlyUnlocked: [], skipped: [] };
  const [{ data: visibleProducts, error: productError }, schemes] = await Promise.all([
    supabase.rpc("resolve_visible_products", { p_customer_id: customerId }),
    getVisibleVendorSchemes(customerId),
  ]);
  if (productError) throw new Error("Your permitted catalogue could not be loaded for offer calculation.");
  const products = (visibleProducts ?? []) as Array<Record<string, string | number | boolean | null>>;
  const collectionRows = await supabase.from("product_collections").select("product_id,collection_id").in("product_id", productIds);
  if (collectionRows.error) throw new Error("Product offer details could not be loaded. Refresh and try again.");
  const collectionIdsByProduct = new Map<string, string[]>();
  for (const row of collectionRows.data ?? []) collectionIdsByProduct.set(row.product_id, [...(collectionIdsByProduct.get(row.product_id) ?? []), row.collection_id]);
  const productById = new Map(products.map((product) => [String(product.id), product]));
  const toSchemeProduct = (productId: string, unitPricePKR?: string): SchemeProduct | null => {
    const product = productById.get(productId);
    if (!product) return null;
    return { id: productId, categoryId: String(product.category_id), brandId: product.brand_id ? String(product.brand_id) : null, collectionIds: collectionIdsByProduct.get(productId) ?? [], unitPricePKR: unitPricePKR ?? String(product.price_pkr), stockQuantity: String(product.stock_quantity), loyaltyPointsPerUnit: Number(product.loyalty_points_per_unit ?? 0) };
  };
  const cartLines: SchemeCartLine[] = (lines ?? []).flatMap((line) => { const product = toSchemeProduct(String(line.product_id), String(line.unit_price_pkr)); return product ? [{ product, quantity: String(line.quantity) }] : []; });
  const catalogueProducts = products.flatMap((product) => { const item = toSchemeProduct(String(product.id)); return item ? [item] : []; });
  return evaluateTradeSchemes(schemes.map((scheme) => ({ ...scheme, schemeType: scheme.scheme_type as never, scopeType: scheme.scope_type as never, scopeIds: scheme.scope_ids, isStackable: scheme.is_stackable, priority: scheme.priority, budgetPKR: scheme.budget_pkr, consumedPKR: scheme.consumed_pkr, maxRedemptionsPerVendor: scheme.max_redemptions_per_vendor, currentVendorRedemptions: 0, tiers: scheme.tiers.map((tier) => ({ id: String(tier.id), minQuantity: tier.minQuantity ? String(tier.minQuantity) : null, minValuePKR: tier.minValuePKR ? String(tier.minValuePKR) : null, freeProductId: tier.freeProductId ? String(tier.freeProductId) : null, freeQuantity: tier.freeQuantity ? String(tier.freeQuantity) : null, discountPercent: tier.discountPercent ? String(tier.discountPercent) : null, discountAmountPKR: tier.discountAmountPKR ? String(tier.discountAmountPKR) : null, displayOrder: Number(tier.displayOrder ?? 0) })) })), cartLines, catalogueProducts);
}
