"use server";

import { runAction } from "@/lib/actions/safe";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function requestLoyaltyRedemptionAction__run(formData: FormData) {
  await requirePermission("redemption.request");
  const rewardId = String(formData.get("rewardId") ?? "").trim();
  if (!rewardId) throw new Error("Select a reward first.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("request_loyalty_redemption", { p_reward_id: rewardId });
  if (error) throw new Error("The reward request could not be created. Check your balance and try again.");
  revalidatePath("/[locale]/vendor/points", "page");
}

// Exposed actions return the error message instead of throwing (see lib/actions/safe.ts).
export async function requestLoyaltyRedemptionAction(...args: Parameters<typeof requestLoyaltyRedemptionAction__run>) { return runAction(requestLoyaltyRedemptionAction__run, args); }
