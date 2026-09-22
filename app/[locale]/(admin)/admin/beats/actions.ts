"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBeatError, parseAreaCodes } from "@/lib/beat/queries";

export async function createBeatAction(formData: FormData) {
  await requirePermission("beat.manage");
  const name = String(formData.get("name") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "");
  const dayOfWeek = Number.parseInt(String(formData.get("dayOfWeek") ?? ""), 10);
  const targetFrequencyDays = Number.parseInt(String(formData.get("targetFrequencyDays") ?? "30"), 10);
  const areaCodes = parseAreaCodes(String(formData.get("areaCodes") ?? ""));
  if (name.length < 2 || !agentId || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(targetFrequencyDays) || targetFrequencyDays < 1) {
    throw new Error("Enter a beat name, Sales Agent, day, and valid target frequency.");
  }
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("create_beat_from_areas", { p_name: name, p_agent_id: agentId, p_day_of_week: dayOfWeek, p_area_codes: areaCodes, p_target_frequency_days: targetFrequencyDays });
  if (error) throw new Error(normalizeBeatError(error));
  revalidatePath("/[locale]/admin/beats", "page");
}

export async function planBeatAction(formData: FormData) {
  await requirePermission("beat.manage");
  const beatId = String(formData.get("beatId") ?? "");
  const plannedDate = String(formData.get("plannedDate") ?? "");
  if (!beatId || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) throw new Error("Choose a valid planned date.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("materialize_beat_visits", { p_beat_id: beatId, p_planned_date: plannedDate });
  if (error) throw new Error(normalizeBeatError(error));
  revalidatePath("/[locale]/admin/beats", "page");
  revalidatePath("/[locale]/sales/beat", "page");
}

export async function toggleBeatAction(formData: FormData) {
  await requirePermission("beat.manage");
  const beatId = String(formData.get("beatId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!beatId) throw new Error("Beat was not selected.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("beats").update({ is_active: isActive }).eq("id", beatId);
  if (error) throw new Error("Beat status could not be updated.");
  revalidatePath("/[locale]/admin/beats", "page");
}

export async function createBeatFrequencyTargetAction(formData: FormData) {
  await requirePermission("beat.manage");
  const beatId = String(formData.get("beatId") ?? "");
  const customerType = String(formData.get("customerType") ?? "").trim();
  const vendorGroupId = String(formData.get("vendorGroupId") ?? "").trim();
  const frequencyDays = Number.parseInt(String(formData.get("frequencyDays") ?? ""), 10);
  const validTypes = ["AUTO_PARTS", "OIL_CHANGE", "CAR_WASH", "DETAILING", "PAINT_HARDWARE", "FUEL_STATION", "DISTRIBUTOR", "OTHER"];
  if (!beatId || !Number.isInteger(frequencyDays) || frequencyDays < 1 || (!validTypes.includes(customerType) && !vendorGroupId)) throw new Error("Choose a customer type or Vendor Group and a valid frequency.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("beat_frequency_targets").insert({ beat_id: beatId, customer_type: validTypes.includes(customerType) ? customerType : null, vendor_group_id: vendorGroupId || null, frequency_days: frequencyDays });
  if (error) throw new Error("Frequency target could not be saved.");
  revalidatePath("/[locale]/admin/beats", "page");
}
