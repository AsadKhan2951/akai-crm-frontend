"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiLocalToUtcIso } from "@/lib/sales/time";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function jsonArray(formData: FormData, key: string) {
  try {
    const value = JSON.parse(text(formData, key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    throw new Error("The scheme configuration is not valid JSON. Review the tiers and audience fields.");
  }
}

export async function createTradeScheme(formData: FormData) {
  await requirePermission("scheme.create");
  const startsAt = karachiLocalToUtcIso(text(formData, "startsAt"));
  const endsAt = karachiLocalToUtcIso(text(formData, "endsAt"));
  if (!text(formData, "nameEn") || !text(formData, "nameUr") || !text(formData, "termsEn") || !text(formData, "termsUr")) throw new Error("English and Urdu names and terms are required.");
  const tiers = jsonArray(formData, "tiersJson");
  if (!tiers.length) throw new Error("Add at least one scheme tier before saving.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("create_trade_scheme", {
    p_payload: {
      nameEn: text(formData, "nameEn"), nameUr: text(formData, "nameUr"), descriptionEn: text(formData, "descriptionEn"), descriptionUr: text(formData, "descriptionUr"),
      schemeType: text(formData, "schemeType"), scopeType: text(formData, "scopeType"), scopeIds: jsonArray(formData, "scopeIdsJson"), audienceType: text(formData, "audienceType"),
      priority: Number.parseInt(text(formData, "priority") || "100", 10), isStackable: formData.get("isStackable") === "on", startsAt, endsAt,
      budgetPKR: text(formData, "budgetPKR"), maxRedemptionsPerVendor: text(formData, "maxRedemptionsPerVendor"), termsEn: text(formData, "termsEn"), termsUr: text(formData, "termsUr"),
      bannerImageUrl: text(formData, "bannerImageUrl"), tiers, audiences: jsonArray(formData, "audiencesJson"),
    },
  });
  if (error) throw new Error("The scheme could not be saved. Check the fields, schedule, and permissions.");
  revalidatePath("/[locale]/admin/schemes", "page");
}

export async function activateTradeScheme(formData: FormData) {
  await requirePermission("scheme.activate");
  const schemeId = text(formData, "schemeId");
  if (!/^[0-9a-f-]{36}$/i.test(schemeId)) throw new Error("Choose a valid scheme before activating it.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("activate_trade_scheme", { p_scheme_id: schemeId });
  if (error) throw new Error("The scheme could not be activated. Check its schedule and approval permission.");
  revalidatePath("/[locale]/admin/schemes", "page");
}
