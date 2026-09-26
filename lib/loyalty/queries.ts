import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getVendorLoyaltyData(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: customer, error: customerError }, { data: rewards, error: rewardsError }, { data: transactions, error: transactionsError }, { data: redemptions, error: redemptionsError }] = await Promise.all([
    supabase.from("customers").select("id,loyalty_points_balance").eq("id", customerId).maybeSingle(),
    supabase.from("rewards").select("id,name_en,name_ur,description_en,description_ur,image_url,reward_type,points_cost,discount_value_pkr,discount_percent,free_product_id,free_product_quantity,stock_limit,redeemed_count,is_active,starts_at,ends_at").order("points_cost", { ascending: true }),
    supabase.from("loyalty_transactions").select("id,points,reason,created_at,order_id,redemption_id").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
    supabase.from("redemptions").select("id,reward_id,points_spent,status,requested_at,fulfilled_at,rejected_reason,reward:rewards(name_en,name_ur)").eq("customer_id", customerId).order("requested_at", { ascending: false }).limit(50),
  ]);
  if (customerError || rewardsError || transactionsError || redemptionsError || !customer) throw new Error("Loyalty information could not be loaded. Refresh and try again.");
  const normalizedRedemptions = (redemptions ?? []).map((item) => ({ ...item, reward: Array.isArray(item.reward) ? item.reward[0] ?? null : item.reward }));
  return { customer, rewards: rewards ?? [], transactions: transactions ?? [], redemptions: normalizedRedemptions };
}

export async function getAdminLoyaltyData() {
  const supabase = await getSupabaseServerClient();
  const [{ data: rewards, error: rewardsError }, { data: redemptions, error: redemptionsError }, { data: liability, error: liabilityError }, { data: popularity, error: popularityError }] = await Promise.all([
    supabase.from("rewards").select("id,name_en,name_ur,reward_type,points_cost,discount_value_pkr,discount_percent,free_product_id,free_product_quantity,stock_limit,redeemed_count,is_active,starts_at,ends_at").order("is_active", { ascending: false }).order("points_cost", { ascending: true }),
    supabase.from("redemptions").select("id,customer_id,reward_id,points_spent,status,requested_at,fulfilled_at,rejected_reason,customer:customers(business_name),reward:rewards(name_en,name_ur)").in("status", ["REQUESTED", "APPROVED"]).order("requested_at", { ascending: true }).limit(200),
    supabase.rpc("loyalty_liability_summary"),
    supabase.rpc("redemption_popularity"),
  ]);
  if (rewardsError || redemptionsError || liabilityError || popularityError) throw new Error("Rewards data could not be loaded. Refresh and try again.");
  const normalizedRedemptions = (redemptions ?? []).map((item) => ({ ...item, customer: Array.isArray(item.customer) ? item.customer[0] ?? null : item.customer, reward: Array.isArray(item.reward) ? item.reward[0] ?? null : item.reward }));
  return { rewards: rewards ?? [], redemptions: normalizedRedemptions, liability: liability?.[0] ?? null, popularity: popularity ?? [] };
}
