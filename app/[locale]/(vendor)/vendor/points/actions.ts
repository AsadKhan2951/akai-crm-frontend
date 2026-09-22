"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requestLoyaltyRedemptionAction(formData: FormData) {
  await requirePermission("redemption.request");
  const rewardId = String(formData.get("rewardId") ?? "").trim();
  if (!rewardId) throw new Error("Select a reward first.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("request_loyalty_redemption", { p_reward_id: rewardId });
  if (error) throw new Error("The reward request could not be created. Check your balance and try again.");
  revalidatePath("/[locale]/vendor/points", "page");
}
