"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";

async function vendorId() {
  const id = await getCurrentVendorCustomerId();
  if (!id) throw new Error("Your Vendor account is not configured. Ask an AKAI administrator to link it.");
  return id;
}

export async function addVendorCartLine(formData: FormData) {
  await requirePermission("order.create");
  const productId = String(formData.get("productId") ?? "");
  const quantity = String(formData.get("quantity") ?? "1");
  if (!productId) throw new Error("Choose a product before adding it to the cart.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("add_vendor_cart_line", { p_product_id: productId, p_quantity: quantity });
  if (error) throw new Error("The product could not be added to your cart. Please try again.");
  revalidatePath("/[locale]/vendor", "layout");
}

export async function updateVendorCartLine(formData: FormData) {
  await requirePermission("order.create");
  await vendorId();
  const lineId = String(formData.get("lineId") ?? "");
  const quantity = String(formData.get("quantity") ?? "0");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("update_vendor_cart_line", { p_cart_line_id: lineId, p_quantity: quantity });
  if (error) throw new Error("The cart quantity could not be updated. Please try again.");
  revalidatePath("/[locale]/vendor/cart", "page");
}

export async function placeVendorOrder(formData: FormData) {
  await requirePermission("order.create");
  await vendorId();
  const cartId = String(formData.get("cartId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const points = Number.parseInt(String(formData.get("points") ?? "0"), 10) || 0;
  const paymentMethod = String(formData.get("paymentMethod") ?? "BALANCE");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_vendor_order_from_cart_with_schemes", { p_cart_id: cartId, p_notes: notes, p_points_to_redeem: points, p_payment_method: paymentMethod });
  if (error || !data) throw new Error("The order could not be placed. Review the cart and try again.");
  const locale = String(formData.get("locale") ?? "en");
  redirect(`/${locale}/vendor/orders/${data}` as never);
}

export async function requestVendorQuote(formData: FormData) {
  await requirePermission("quote.create");
  await vendorId();
  const cartId = String(formData.get("cartId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_vendor_quote_from_cart", { p_cart_id: cartId, p_notes: notes });
  if (error || !data) throw new Error("The quote could not be requested. Review the cart and try again.");
  const locale = String(formData.get("locale") ?? "en");
  redirect(`/${locale}/vendor/quotes/${data}` as never);
}

export async function acceptVendorQuote(formData: FormData) {
  await requirePermission("order.create");
  await vendorId();
  const quoteId = String(formData.get("quoteId") ?? "");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_vendor_quote_with_schemes", { p_quote_id: quoteId });
  if (error || !data) throw new Error("This quote could not be accepted. It may be expired or already used.");
  const locale = String(formData.get("locale") ?? "en");
  redirect(`/${locale}/vendor/orders/${data}` as never);
}

export async function declineVendorQuote(formData: FormData) {
  await requirePermission("quote.create");
  await vendorId();
  const quoteId = String(formData.get("quoteId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("decline_vendor_quote", { p_quote_id: quoteId, p_reason: reason });
  if (error) throw new Error("This quote could not be declined. Please try again.");
  revalidatePath("/[locale]/vendor/quotes", "page");
}

export async function reorderVendorOrder(formData: FormData) {
  await requirePermission("order.create");
  await vendorId();
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("reorder_vendor_order", { p_order_id: orderId });
  if (error) throw new Error("The order could not be added to your cart. Please try again.");
  const locale = String(formData.get("locale") ?? "en");
  redirect(`/${locale}/vendor/cart?skipped=${encodeURIComponent(String(data ?? 0))}`);
}

export async function requestVendorRedemption(formData: FormData) {
  await requirePermission("redemption.request" as never);
  await vendorId();
  const rewardId = String(formData.get("rewardId") ?? "");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("request_vendor_redemption", { p_reward_id: rewardId });
  if (error) throw new Error("The redemption could not be requested. Check your points balance and try again.");
  revalidatePath("/[locale]/vendor/points", "page");
}

export async function acknowledgeVendorCartPrices(formData: FormData) {
  await requirePermission("order.create"); await vendorId(); const cartId = String(formData.get("cartId") ?? "");
  const supabase = await getSupabaseServerClient(); const { error } = await supabase.rpc("acknowledge_cart_price_changes", { target_cart_id: cartId });
  if (error) throw new Error("The new cart prices could not be accepted. Please refresh and try again.");
  revalidatePath("/[locale]/vendor/cart", "page");
}

export async function requestVendorQuoteForProduct(formData: FormData) {
  await requirePermission("quote.create"); await vendorId();
  const productId = String(formData.get("productId") ?? ""); const quantity = String(formData.get("quantity") ?? "1"); const notes = String(formData.get("notes") ?? "").trim() || null;
  const supabase = await getSupabaseServerClient(); const { data, error } = await supabase.rpc("request_vendor_quote_for_product", { p_product_id: productId, p_quantity: quantity, p_notes: notes });
  if (error || !data) throw new Error("The quote could not be requested. Please try again.");
  const locale = String(formData.get("locale") ?? "en"); redirect(`/${locale}/vendor/quotes/${data}` as never);
}

export async function draftVendorAssistantAction(_previous: { ok: boolean; productIds: string[]; reason?: string } | null, formData: FormData) {
  await requirePermission("ai.chat");
  const customerId = await vendorId(); const query = String(formData.get("query") ?? "");
  const { draftVendorAssistant } = await import("@/lib/ai/vendor");
  return draftVendorAssistant(customerId, query);
}
