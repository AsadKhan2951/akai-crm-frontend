"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Result = { ok: true; count?: number } | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(error: { message?: string; code?: string }, fallback: string): Result {
  if (error.code === "PGRST202") return { ok: false, error: "This action needs the latest database update (migration 0069). Run supabase db push." };
  if (error.code === "42501") return { ok: false, error: error.message || "You do not have permission to do this." };
  return { ok: false, error: error.message && error.message.length < 200 ? error.message : fallback };
}

function refresh() {
  for (const path of ["/admin/orders", "/admin", "/admin/delivery", "/sales/orders", "/vendor/orders"]) revalidatePath(`/[locale]${path}`, "layout");
}

/** Move PLACED orders to CONFIRMED so they can be picked and dispatched. Postgres checks permission and scope. */
export async function confirmOrders(orderIds: string[]): Promise<Result> {
  const ids = orderIds.filter((id) => UUID.test(id));
  if (!ids.length) return { ok: false, error: "Choose at least one placed order." };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("confirm_orders", { p_order_ids: ids });
  if (error) return failure(error, "The orders could not be confirmed. Refresh and try again.");
  refresh();
  return { ok: true, count: Number(data ?? 0) };
}

export async function cancelOrder(orderId: string, reason: string): Promise<Result> {
  if (!UUID.test(orderId)) return { ok: false, error: "Choose an order first." };
  if (!reason.trim()) return { ok: false, error: "Enter a reason for cancelling." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_reason: reason.trim() });
  if (error) return failure(error, "The order could not be cancelled. Refresh and try again.");
  refresh();
  return { ok: true };
}
