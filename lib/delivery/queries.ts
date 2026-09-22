import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getDeliveryAdminData() {
  const supabase = await getSupabaseServerClient();
  const [{ data: orders, error: orderError }, { data: runs, error: runError }, { data: pickingLists, error: pickingError }] = await Promise.all([
    supabase.from("orders").select("id,order_number,customer_id,status,total_pkr,payment_method,placed_at,customer:customers(business_name,area_code)").in("status", ["CONFIRMED", "PICKED"]).order("placed_at", { ascending: true }).limit(200),
    supabase.from("delivery_runs").select("id,run_number,driver_name,vehicle_number,run_date,status,total_stops,completed_stops,expected_cod_amount_pkr,collected_cod_amount_pkr").order("run_date", { ascending: false }).limit(100),
    supabase.from("picking_lists").select("id,pick_number,status,created_at,completed_at,picking_list_lines(id,product_id,quantity_required,quantity_picked,quantity_short,short_reason,product:products(sku,name_en,name_ur))").order("created_at", { ascending: false }).limit(50),
  ]);
  if (orderError || runError || pickingError) throw new Error("Delivery data could not be loaded. Refresh and try again.");
  return { orders: orders ?? [], runs: runs ?? [], pickingLists: pickingLists ?? [] };
}

export async function getDeliveryRun(runId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: run, error: runError }, { data: stops, error: stopError }] = await Promise.all([
    supabase.from("delivery_runs").select("id,run_number,driver_name,vehicle_number,run_date,status,total_stops,completed_stops,expected_cod_amount_pkr,collected_cod_amount_pkr,notes").eq("id", runId).maybeSingle(),
    supabase.from("delivery_stops").select("id,sequence,status,order_id,customer_id,delivered_at,received_by_name,photo_url,signature_url,latitude,longitude,cod_amount_pkr,cod_collected,failure_reason,notes,customer:customers(business_name,full_address,primary_phone),order:orders(order_number,total_pkr)").eq("run_id", runId).order("sequence"),
  ]);
  if (runError || stopError || !run) throw new Error("Delivery run could not be loaded. Refresh and try again.");
  return { run, stops: stops ?? [] };
}

export async function getDriverRunByToken(tokenHash: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: run, error: runError }, { data: stops, error: stopError }] = await Promise.all([
    supabase.rpc("get_delivery_run_by_token", { p_token_hash: tokenHash }),
    supabase.rpc("get_delivery_stops_by_token", { p_token_hash: tokenHash }),
  ]);
  if (runError || stopError) throw new Error("This driver link is invalid or expired.");
  type DriverStop = { stop_id: string; [key: string]: unknown };
  const stopRows = (stops ?? []) as DriverStop[];
  const withLines = await Promise.all(stopRows.map(async (stop: DriverStop) => {
    const { data: lines, error } = await supabase.rpc("get_delivery_stop_lines_by_token", { p_token_hash: tokenHash, p_stop_id: stop.stop_id });
    if (error) throw new Error("Delivery line details could not be loaded.");
    return { ...stop, lines: lines ?? [] };
  }));
  return { run: run?.[0] ?? null, stops: withLines };
}
