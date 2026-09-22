"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createRewardAction(formData: FormData) {
  await requirePermission("reward.manage");
  const supabase = await getSupabaseServerClient();
  const payload = {
    nameEn: value(formData, "nameEn"), nameUr: value(formData, "nameUr"), descriptionEn: value(formData, "descriptionEn"), descriptionUr: value(formData, "descriptionUr"), rewardType: value(formData, "rewardType"), pointsCost: value(formData, "pointsCost"), discountValuePKR: value(formData, "discountValuePKR"), discountPercent: value(formData, "discountPercent"), freeProductId: value(formData, "freeProductId"), freeProductQuantity: value(formData, "freeProductQuantity"), stockLimit: value(formData, "stockLimit"), startsAt: value(formData, "startsAt"), endsAt: value(formData, "endsAt"), isActive: true,
  };
  const { error } = await supabase.rpc("create_reward", { p_payload: payload });
  if (error) throw new Error("The reward could not be created. Check the fields and try again.");
  revalidatePath("/[locale]/admin/rewards", "page");
}

export async function approveRedemptionAction(formData: FormData) {
  await requirePermission("redemption.approve");
  const redemptionId = value(formData, "redemptionId");
  const orderId = value(formData, "orderId") || null;
  if (!redemptionId) throw new Error("Select a redemption request first.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("approve_loyalty_redemption", { p_redemption_id: redemptionId, p_order_id: orderId });
  if (error) throw new Error("The redemption could not be approved. Check the order and reward stock.");
  revalidatePath("/[locale]/admin/rewards", "page");
}

export async function rejectRedemptionAction(formData: FormData) {
  await requirePermission("redemption.approve");
  const redemptionId = value(formData, "redemptionId");
  const reason = value(formData, "reason");
  if (!redemptionId || !reason) throw new Error("A redemption and rejection reason are required.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reject_loyalty_redemption", { p_redemption_id: redemptionId, p_reason: reason });
  if (error) throw new Error("The redemption could not be rejected.");
  revalidatePath("/[locale]/admin/rewards", "page");
}

export async function adjustLoyaltyPointsAction(formData: FormData) {
  await requirePermission("loyalty.adjust");
  const customerId = value(formData, "customerId");
  const delta = value(formData, "delta");
  const reason = value(formData, "reason");
  if (!customerId || !delta || !reason) throw new Error("Customer, points adjustment, and reason are required.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("adjust_loyalty_points", { p_customer_id: customerId, p_delta: Number.parseInt(delta, 10), p_reason: reason });
  if (error) throw new Error("The points adjustment could not be saved. Check the customer and reason.");
  revalidatePath("/[locale]/admin/rewards", "page");
}
