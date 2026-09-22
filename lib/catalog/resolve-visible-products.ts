import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VisibleProduct = {
  id: string;
  sku: string;
  name_en: string;
  name_ur: string;
  description_en: string | null;
  description_ur: string | null;
  category_id: string;
  brand_id: string;
  unit_of_measure: string;
  pack_size: string;
  price_pkr: string;
  compare_at_price_pkr: string | null;
  loyalty_points_per_unit: number;
  stock_quantity: string;
  low_stock_threshold: string;
  is_active: boolean;
  is_quote_only: boolean;
  created_at: string;
  updated_at: string;
};

export async function resolveVisibleProducts(customerId: string, client?: SupabaseClient): Promise<VisibleProduct[]> {
  const supabase = client ?? await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("resolve_visible_products", { p_customer_id: customerId });
  if (error) throw new Error("The visible catalogue could not be loaded.");
  return (data ?? []) as VisibleProduct[];
}
