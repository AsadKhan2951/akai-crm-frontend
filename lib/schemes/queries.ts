import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type VisibleScheme = {
  id: string;
  name_en: string;
  name_ur: string;
  description_en: string | null;
  description_ur: string | null;
  scheme_type: string;
  scope_type: string;
  scope_ids: string[];
  priority: number;
  is_stackable: boolean;
  starts_at: string;
  ends_at: string;
  budget_pkr: string | null;
  consumed_pkr: string;
  max_redemptions_per_vendor: number | null;
  terms_en: string;
  terms_ur: string;
  tiers: Array<Record<string, unknown>>;
};

export async function getVisibleVendorSchemes(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("resolve_visible_schemes", { p_customer_id: customerId });
  if (error) throw new Error("Offers could not be loaded. Refresh and try again.");
  return (data ?? []) as VisibleScheme[];
}

export async function getAdminSchemes() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("schemes").select("id,name_en,name_ur,scheme_type,scope_type,audience_type,priority,is_stackable,starts_at,ends_at,is_active,budget_pkr,consumed_pkr,max_redemptions_per_vendor,terms_en,terms_ur").order("created_at", { ascending: false });
  if (error) throw new Error("Trade schemes could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getCustomerSchemes(customerId: string) {
  return getVisibleVendorSchemes(customerId);
}

export async function getSchemePerformance(schemeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("scheme_performance_summary", { p_scheme_id: schemeId });
  if (error) throw new Error("Scheme performance could not be loaded. Refresh and try again.");
  return (data?.[0] ?? { units_moved: "0", revenue_pkr: "0.00", benefit_cost_pkr: "0.00", participating_dealers: 0 }) as { units_moved: string; revenue_pkr: string; benefit_cost_pkr: string; participating_dealers: number };
}
