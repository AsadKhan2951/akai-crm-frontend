"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiLocalToUtcIso } from "@/lib/sales/time";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const localeOf = (formData: FormData) => (text(formData, "locale") === "ur" ? "ur" : "en");
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function done(locale: string, path: string, status: string, extra: Record<string, string> = {}): never {
  const params = new URLSearchParams({ ...extra, status });
  redirect(`/${locale}${path}?${params.toString()}`);
}
function code(error: { code?: string } | null) {
  if (!error) return "saveFailed";
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "noPermission";
  if (error.code === "22023" || error.code === "22P02" || error.code === "23514") return "invalid";
  return "saveFailed";
}

// ----- Vendor groups -----------------------------------------------------------

export async function saveVendorGroupAction(formData: FormData) {
  await requirePermission("vendorgroup.manage");
  const locale = localeOf(formData);
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) done(locale, "/admin/catalogue/vendor-groups", "error", { code: "invalid" });
  const record = { name, description: text(formData, "description") || null, show_all_by_default: formData.get("showAll") === "on" };
  const supabase = await getSupabaseServerClient();
  const { error } = id ? await supabase.from("vendor_groups").update(record).eq("id", id) : await supabase.from("vendor_groups").insert(record);
  if (error) done(locale, "/admin/catalogue/vendor-groups", "error", { code: code(error) });
  revalidatePath("/[locale]/admin/catalogue/vendor-groups", "page");
  done(locale, "/admin/catalogue/vendor-groups", "saved");
}

export async function makeDefaultVendorGroupAction(formData: FormData) {
  await requirePermission("vendorgroup.manage");
  const locale = localeOf(formData);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_default_vendor_group", { p_group_id: text(formData, "id") });
  if (error) done(locale, "/admin/catalogue/vendor-groups", "error", { code: code(error) });
  revalidatePath("/[locale]/admin/catalogue/vendor-groups", "page");
  done(locale, "/admin/catalogue/vendor-groups", "saved");
}

export async function assignVendorGroupAction(formData: FormData) {
  await requirePermission("vendorgroup.manage");
  const locale = localeOf(formData);
  const groupId = text(formData, "groupId");
  const customerIds = formData.getAll("customerIds").map(String).filter(isUuid);
  if (!isUuid(groupId) || customerIds.length === 0) done(locale, "/admin/catalogue/vendor-groups", "error", { code: "invalid" });
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("assign_customers_to_vendor_group", { p_group_id: groupId, p_customer_ids: customerIds });
  if (error) done(locale, "/admin/catalogue/vendor-groups", "error", { code: code(error) });
  revalidatePath("/[locale]/admin/catalogue/vendor-groups", "page");
  done(locale, "/admin/catalogue/vendor-groups", "saved");
}

// ----- Visibility rules ----------------------------------------------------------

export async function setVisibilityRuleAction(formData: FormData) {
  await requirePermission("catalogvisibility.manage");
  const locale = localeOf(formData);
  const scopeType = text(formData, "scopeType") === "VENDOR" ? "VENDOR" : "GROUP";
  const scopeId = text(formData, "scopeId");
  const entityType = ["CATEGORY", "BRAND", "PRODUCT"].includes(text(formData, "entityType")) ? text(formData, "entityType") : "";
  const entityId = text(formData, "entityId");
  const mode = text(formData, "mode");
  const back = { scope: scopeType, id: scopeId, q: text(formData, "q") };
  if (!isUuid(scopeId) || !isUuid(entityId) || !entityType) done(locale, "/admin/catalogue/visibility", "error", { code: "invalid", ...back });
  const supabase = await getSupabaseServerClient();
  const { error } = mode === "CLEAR"
    ? await supabase.from("catalog_visibility_rules").delete().eq("scope_type", scopeType).eq("scope_id", scopeId).eq("entity_type", entityType).eq("entity_id", entityId)
    : await supabase.rpc("set_catalog_visibility_rule", { p_scope_type: scopeType, p_scope_id: scopeId, p_entity_type: entityType, p_entity_id: entityId, p_mode: mode === "DENY" ? "DENY" : "ALLOW" });
  if (error) done(locale, "/admin/catalogue/visibility", "error", { code: code(error), ...back });
  revalidatePath("/[locale]/admin/catalogue/visibility", "page");
  done(locale, "/admin/catalogue/visibility", "saved", back);
}

// ----- Promotional banners ---------------------------------------------------------

export async function createBannerAction(formData: FormData) {
  await requirePermission("banner.manage");
  const locale = localeOf(formData);
  const path = "/admin/catalogue/banners";
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) done(locale, path, "error", { code: "noPermission" });
  const linkType = text(formData, "linkType") || "NONE";
  const audienceType = text(formData, "audienceType") || "ALL";
  const titleEn = text(formData, "titleEn"); const titleUr = text(formData, "titleUr"); const imageUrl = text(formData, "imageUrl");
  const startsAt = text(formData, "startsAt"); const endsAt = text(formData, "endsAt");
  const linkTargetId = text(formData, "linkTargetId");
  if (!titleEn || !titleUr || !/^https:\/\//.test(imageUrl) || !startsAt || !endsAt) done(locale, path, "error", { code: "invalid" });
  if (["PRODUCT", "CATEGORY", "BRAND", "COLLECTION"].includes(linkType) && !isUuid(linkTargetId)) done(locale, path, "error", { code: "invalid" });
  const record = {
    title_en: titleEn, title_ur: titleUr,
    subtitle_en: text(formData, "subtitleEn") || null, subtitle_ur: text(formData, "subtitleUr") || null,
    image_url: imageUrl, image_url_ur: /^https:\/\//.test(text(formData, "imageUrlUr")) ? text(formData, "imageUrlUr") : null,
    link_type: linkType, link_target_id: ["PRODUCT", "CATEGORY", "BRAND", "COLLECTION"].includes(linkType) ? linkTargetId : null,
    external_url: linkType === "EXTERNAL_URL" && /^https:\/\//.test(text(formData, "externalUrl")) ? text(formData, "externalUrl") : null,
    cta_type: ["BUY_NOW", "REQUEST_QUOTE", "VIEW"].includes(text(formData, "ctaType")) ? text(formData, "ctaType") : "VIEW",
    audience_type: ["ALL", "GROUP", "SPECIFIC_VENDORS"].includes(audienceType) ? audienceType : "ALL",
    display_order: Number.parseInt(text(formData, "displayOrder") || "0", 10) || 0,
    starts_at: karachiLocalToUtcIso(startsAt), ends_at: karachiLocalToUtcIso(endsAt),
    is_active: true, created_by_user_id: user!.id,
  };
  const { data: banner, error } = await supabase.from("promo_banners").insert(record).select("id").single();
  if (error || !banner) done(locale, path, "error", { code: code(error) });
  const audiences: Array<{ banner_id: string; vendor_group_id?: string; customer_id?: string }> = audienceType === "GROUP"
    ? (isUuid(text(formData, "vendorGroupId")) ? [{ banner_id: banner.id, vendor_group_id: text(formData, "vendorGroupId") }] : [])
    : audienceType === "SPECIFIC_VENDORS" ? formData.getAll("customerIds").map(String).filter(isUuid).map((customerId) => ({ banner_id: banner.id, customer_id: customerId })) : [];
  if (audiences.length) {
    const { error: audienceError } = await supabase.from("promo_banner_audiences").insert(audiences);
    if (audienceError) done(locale, path, "error", { code: code(audienceError) });
  }
  revalidatePath("/[locale]/admin/catalogue/banners", "page");
  done(locale, path, "saved");
}

export async function toggleBannerAction(formData: FormData) {
  await requirePermission("banner.manage");
  const locale = localeOf(formData);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").update({ is_active: text(formData, "isActive") === "true" }).eq("id", text(formData, "id"));
  if (error) done(locale, "/admin/catalogue/banners", "error", { code: code(error) });
  revalidatePath("/[locale]/admin/catalogue/banners", "page");
  done(locale, "/admin/catalogue/banners", "saved");
}

export async function deleteBannerAction(formData: FormData) {
  await requirePermission("banner.manage");
  const locale = localeOf(formData);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").delete().eq("id", text(formData, "id"));
  if (error) done(locale, "/admin/catalogue/banners", "error", { code: code(error) });
  revalidatePath("/[locale]/admin/catalogue/banners", "page");
  done(locale, "/admin/catalogue/banners", "deleted");
}
