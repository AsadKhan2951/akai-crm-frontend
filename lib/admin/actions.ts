"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentUserPermission } from "@/lib/auth/server";
import type { PermissionKey } from "@/lib/auth/permissions";

/* Server actions for the redesigned Admin console. Every write goes through an AKAI RPC that
 * checks permissions in Postgres and writes the audit log. */

type Result = { ok: true } | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOMER_TYPES = new Set(["AUTO_PARTS", "OIL_CHANGE", "CAR_WASH", "DETAILING", "PAINT_HARDWARE", "FUEL_STATION", "DISTRIBUTOR", "OTHER"]);

async function guard(permission: PermissionKey): Promise<Result | null> {
  return (await hasCurrentUserPermission(permission)) ? null : { ok: false, error: "You do not have permission to do this." };
}

function friendly(error: { message?: string; code?: string } | null, fallback: string): Result {
  if (!error) return { ok: true };
  if (error.code === "42501") return { ok: false, error: "You do not have permission to do this." };
  return { ok: false, error: error.message && error.message.length < 160 ? error.message : fallback };
}

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(`/[locale]${path}`, "layout");
}

export async function approveOrder(orderId: string): Promise<Result> {
  const denied = await guard("order.approve");
  if (denied) return denied;
  if (!UUID.test(orderId)) return { ok: false, error: "Choose an order first." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("approve_admin_order", { p_order_id: orderId });
  const result = friendly(error, "The order could not be approved. Refresh and try again.");
  if (result.ok) refresh("/admin");
  return result;
}

export async function rejectOrder(orderId: string, reason?: string): Promise<Result> {
  const denied = await guard("order.approve");
  if (denied) return denied;
  const text = (reason ?? "").trim();
  if (!UUID.test(orderId)) return { ok: false, error: "Choose an order first." };
  if (!text) return { ok: false, error: "REASON_REQUIRED" };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reject_admin_order", { p_order_id: orderId, p_reason: text.slice(0, 500) });
  const result = friendly(error, "The order could not be rejected. Refresh and try again.");
  if (result.ok) refresh("/admin");
  return result;
}

async function bulk(ids: string[], params: { p_agent_id?: string | null; p_unassign?: boolean; p_customer_type?: string | null; p_accept_suggestion?: boolean }): Promise<Result> {
  const customerIds = ids.filter((id) => UUID.test(id)).slice(0, 500);
  if (!customerIds.length) return { ok: true };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_bulk_update_customers", { p_customer_ids: customerIds, ...params });
  const result = friendly(error, "The customers could not be updated. Refresh and try again.");
  if (result.ok) refresh("/admin/customers", "/admin");
  return result;
}

export async function assignAgent(customerIds: string[], agentId: string | null): Promise<Result> {
  const denied = await guard("customer.reassign_agent");
  if (denied) return denied;
  if (agentId && !UUID.test(agentId)) return { ok: false, error: "Choose a Sales Agent." };
  return bulk(customerIds, agentId ? { p_agent_id: agentId } : { p_unassign: true });
}

export async function setCustomerType(customerIds: string[], type: string): Promise<Result> {
  if (!CUSTOMER_TYPES.has(type)) return { ok: false, error: "Choose a customer type." };
  return bulk(customerIds, { p_customer_type: type });
}

/** Accept the import's type suggestion for each selected customer. */
export async function acceptTypeSuggestions(customerIds: string[]): Promise<Result> {
  return bulk(customerIds, { p_accept_suggestion: true });
}

/** Phones: switch between the read-only glance and the full console. */
export async function setDesktopView() {
  (await cookies()).set("admin_view", "desktop", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  refresh("/admin");
}

export async function setGlanceView() {
  (await cookies()).delete("admin_view");
  refresh("/admin");
}
