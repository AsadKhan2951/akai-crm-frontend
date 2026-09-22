import "server-only";

import { getSystemSupabaseClient } from "./system-job";

export async function reconcileLoyaltyBalancesSystemJob() {
  const supabase = getSystemSupabaseClient();
  const { data, error } = await supabase.rpc("reconcile_loyalty_balances");
  if (error) throw new Error("Loyalty reconciliation could not be completed.");
  return Number(data ?? 0);
}
