import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SalesOrderRow = { id: string; order_number: string; status: string; total_pkr: string; placed_at: string | null; created_at: string; placed_via: string; customer: { id: string; business_name: string; area_code: string | null } | null };
export type SalesOrderLine = { id: string; quantity: string; unit_price_pkr: string; line_total_pkr: string; is_free_item: boolean; product: { sku: string; name_en: string | null; name_ur: string | null } | null };

const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);

/** Recent orders the signed-in Sales user can see (RLS scopes them to the agent's customers). */
export async function getSalesOrders(search = "", status = "") {
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select("id,order_number,status,total_pkr,placed_at,created_at,placed_via,customer:customers!orders_customer_id_fkey(id,business_name,area_code)")
    .neq("status", "DRAFT")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const clean = search.replace(/[(),%*\\]/g, " ").trim();
  if (clean) query = query.ilike("order_number", `%${clean}%`);
  const { data, error } = await query;
  if (error) throw new Error("Orders could not be loaded. Refresh and try again.");
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({ ...row, customer: one(row.customer as SalesOrderRow["customer"]) })) as SalesOrderRow[];
}

export async function getSalesOrder(orderId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: order }, { data: lines }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,status,total_pkr,subtotal_pkr,discount_pkr,points_discount_pkr,placed_at,created_at,placed_via,payment_method,notes,rejection_reason,customer:customers!orders_customer_id_fkey(id,business_name,area_code)")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("order_lines")
      .select("id,quantity,unit_price_pkr,line_total_pkr,is_free_item,product:products(sku,name_en,name_ur)")
      .eq("order_id", orderId),
  ]);
  if (!order) return null;
  return {
    order: { ...order, customer: one(order.customer as unknown as SalesOrderRow["customer"]) } as SalesOrderRow & { subtotal_pkr: string; discount_pkr: string; points_discount_pkr: string; payment_method: string | null; notes: string | null; rejection_reason: string | null },
    lines: ((lines ?? []) as Array<Record<string, unknown>>).map((line) => ({ ...line, product: one(line.product as SalesOrderLine["product"]) })) as SalesOrderLine[],
  };
}
