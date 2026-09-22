"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function jsonArray(value: string, label: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(label);
    return parsed;
  } catch {
    throw new Error(`${label} is not valid. Refresh the page and try again.`);
  }
}

export async function createPickingListAction(formData: FormData) {
  await requirePermission("delivery.create_run");
  const orderIds = jsonArray(text(formData, "orderIdsJson"), "The selected orders");
  const notes = text(formData, "notes") || null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_picking_list", { p_order_ids: orderIds, p_notes: notes });
  if (error || !data) throw new Error("The picking list could not be created. Select confirmed orders and try again.");
  revalidatePath("/[locale]/admin/delivery", "page");
}

export async function markPickingLineAction(formData: FormData) {
  await requirePermission("delivery.create_run");
  const lineId = text(formData, "pickingListLineId");
  const quantityPicked = text(formData, "quantityPicked");
  const quantityShort = text(formData, "quantityShort") || "0";
  const reason = text(formData, "shortReason") || null;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("mark_picking_line", { p_picking_list_line_id: lineId, p_quantity_picked: quantityPicked, p_quantity_short: quantityShort, p_short_reason: reason });
  if (error) throw new Error("The picked quantity could not be saved. Check the quantities and shortage reason.");
  revalidatePath("/[locale]/admin/delivery", "page");
}

export async function createDeliveryRunAction(formData: FormData) {
  await requirePermission("delivery.create_run");
  const runDate = text(formData, "runDate");
  const driverUserId = text(formData, "driverUserId") || null;
  const driverName = text(formData, "driverName");
  const vehicleNumber = text(formData, "vehicleNumber");
  const orderIds = jsonArray(text(formData, "orderIdsJson"), "The selected orders");
  let codAmounts: Record<string, string>;
  try { codAmounts = JSON.parse(text(formData, "codAmountsJson") || "{}") as Record<string, string>; } catch { throw new Error("COD amounts are not valid. Refresh the page and try again."); }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_delivery_run", { p_run_date: runDate, p_driver_user_id: driverUserId, p_driver_name: driverName, p_vehicle_number: vehicleNumber, p_order_ids: orderIds, p_cod_amounts: codAmounts, p_notes: text(formData, "notes") || null });
  if (error || !data) throw new Error("The delivery run could not be created. Check the date, driver, vehicle, and orders.");
  revalidatePath("/[locale]/admin/delivery", "page");
}
