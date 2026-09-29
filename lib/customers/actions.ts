"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileChanges = Partial<Record<
  "business_name" | "business_name_urdu" | "contact_person_name" | "primary_phone" | "whatsapp_phone" | "email" | "full_address" | "area_code" | "latitude" | "longitude" | "customer_type" | "status" | "vendor_group_id" | "credit_limit_pkr" | "assigned_agent_id",
  string | null
>>;

const ALLOWED = new Set(["business_name", "business_name_urdu", "contact_person_name", "primary_phone", "whatsapp_phone", "email", "full_address", "area_code", "latitude", "longitude", "customer_type", "status", "vendor_group_id", "credit_limit_pkr", "assigned_agent_id"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves only the changed fields through update_customer_profile (permissions, scope and audit in Postgres). */
export async function saveCustomerProfile(customerId: string, changes: ProfileChanges): Promise<{ ok: true; dataComplete: boolean } | { ok: false; error: string }> {
  if (!UUID.test(customerId)) return { ok: false, error: "Choose a customer first." };
  const clean: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!ALLOWED.has(key)) continue;
    clean[key] = value === null || value === undefined ? null : String(value).slice(0, 500);
  }
  if (!Object.keys(clean).length) return { ok: true, dataComplete: false };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_customer_profile", { p_customer_id: customerId, p_changes: clean });
  if (error) {
    if (error.code === "42501") return { ok: false, error: error.message.startsWith("Missing permission") ? "You do not have permission to change one of these fields." : "This customer is not in your area." };
    if (error.code === "PGRST202") return { ok: false, error: "Database update pending: run the latest migration (0067)." };
    return { ok: false, error: error.message && error.message.length < 160 ? error.message : "The customer could not be saved. Try again." };
  }
  revalidatePath("/[locale]/admin/customers", "layout");
  revalidatePath("/[locale]/sales/customers", "layout");
  return { ok: true, dataComplete: (data as { data_complete?: boolean } | null)?.data_complete === true };
}
