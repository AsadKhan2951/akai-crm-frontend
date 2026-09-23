"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import type { PermissionKey } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiLocalToUtcIso } from "@/lib/sales/time";

type EntityTable = "brands" | "categories" | "collections";
const entityPermissions: Record<EntityTable, { create: PermissionKey; update: PermissionKey; delete: PermissionKey; path: string }> = {
  brands: { create: "brand.create", update: "brand.update", delete: "brand.delete", path: "/admin/catalogue/brands" },
  categories: { create: "category.create", update: "category.update", delete: "category.delete", path: "/admin/catalogue/categories" },
  collections: { create: "collection.manage", update: "collection.manage", delete: "collection.manage", path: "/admin/catalogue/collections" },
};

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const optional = (formData: FormData, key: string) => text(formData, key) || null;
const localeOf = (formData: FormData) => (text(formData, "locale") === "ur" ? "ur" : "en");
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const decimal = (value: string) => (/^\d{1,10}(\.\d{1,2})?$/.test(value) ? value : null);
const quantity = (value: string) => (/^\d{1,9}(\.\d{1,3})?$/.test(value) ? value : null);

function slugify(value: string) {
  const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return slug || `item-${crypto.randomUUID().slice(0, 8)}`;
}

function done(locale: string, path: string, status: string, extra: Record<string, string> = {}): never {
  const params = new URLSearchParams({ status, ...extra });
  redirect(`/${locale}${path}?${params.toString()}`);
}

function errorCode(error: { code?: string } | null) {
  if (!error) return "saveFailed";
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "noPermission";
  if (error.code === "23503") return "deleteBlocked";
  if (error.code === "22023" || error.code === "22P02") return "invalid";
  return "saveFailed";
}

// ----- Brands, categories and collections -----------------------------------

export async function saveCatalogueEntityAction(formData: FormData) {
  const table = text(formData, "table") as EntityTable;
  const config = entityPermissions[table];
  if (!config) throw new Error("Unknown catalogue record type.");
  const locale = localeOf(formData);
  const id = text(formData, "id");
  await requirePermission(id ? config.update : config.create);
  const nameEn = text(formData, "nameEn");
  const nameUr = text(formData, "nameUr");
  if (!nameEn || !nameUr) done(locale, config.path, "error", { code: "invalid" });

  const record: Record<string, unknown> = {
    name_en: nameEn,
    name_ur: nameUr,
    display_order: Number.parseInt(text(formData, "displayOrder") || "0", 10) || 0,
    is_active: formData.get("isActive") === "on",
  };
  if (table === "brands") { record.logo_url = optional(formData, "imageUrl"); record.notes = optional(formData, "notes"); }
  if (table === "categories") { record.image_url = optional(formData, "imageUrl"); record.description = optional(formData, "description"); record.notes = optional(formData, "notes"); }
  if (table === "collections") {
    record.image_url = optional(formData, "imageUrl");
    record.description = optional(formData, "description");
    const starts = text(formData, "startsAt"); const ends = text(formData, "endsAt");
    record.starts_at = starts ? karachiLocalToUtcIso(starts) : null;
    record.ends_at = ends ? karachiLocalToUtcIso(ends) : null;
  }
  const supabase = await getSupabaseServerClient();
  const result = id
    ? await supabase.from(table).update(record).eq("id", id)
    : await supabase.from(table).insert({ ...record, slug: text(formData, "slug") ? slugify(text(formData, "slug")) : slugify(nameEn) });
  if (result.error) done(locale, config.path, "error", { code: errorCode(result.error) });
  revalidatePath(`/[locale]${config.path}`, "page");
  done(locale, config.path, "saved");
}

export async function toggleCatalogueEntityAction(formData: FormData) {
  const table = text(formData, "table") as EntityTable;
  const config = entityPermissions[table];
  if (!config) throw new Error("Unknown catalogue record type.");
  await requirePermission(config.update);
  const locale = localeOf(formData);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from(table).update({ is_active: text(formData, "isActive") === "true" }).eq("id", text(formData, "id"));
  if (error) done(locale, config.path, "error", { code: errorCode(error) });
  revalidatePath(`/[locale]${config.path}`, "page");
  done(locale, config.path, "saved");
}

export async function deleteCatalogueEntityAction(formData: FormData) {
  const table = text(formData, "table") as EntityTable;
  const config = entityPermissions[table];
  if (!config) throw new Error("Unknown catalogue record type.");
  await requirePermission(config.delete);
  const locale = localeOf(formData);
  const id = text(formData, "id");
  const supabase = await getSupabaseServerClient();
  const { error } = table === "brands"
    ? await supabase.rpc("delete_catalogue_brand", { p_brand_id: id })
    : table === "categories"
      ? await supabase.rpc("delete_catalogue_category", { p_category_id: id })
      : await supabase.from("collections").delete().eq("id", id);
  if (error) done(locale, config.path, "error", { code: errorCode(error) });
  revalidatePath(`/[locale]${config.path}`, "page");
  done(locale, config.path, "deleted");
}

export async function saveCollectionProductsAction(formData: FormData) {
  await requirePermission("collection.manage");
  const locale = localeOf(formData);
  const collectionId = text(formData, "collectionId");
  const productIds = formData.getAll("productIds").map(String).filter(isUuid);
  const supabase = await getSupabaseServerClient();
  const removed = await supabase.from("product_collections").delete().eq("collection_id", collectionId);
  if (removed.error) done(locale, "/admin/catalogue/collections", "error", { code: errorCode(removed.error) });
  if (productIds.length) {
    const { error } = await supabase.from("product_collections").insert(productIds.map((productId, index) => ({ collection_id: collectionId, product_id: productId, display_order: index })));
    if (error) done(locale, "/admin/catalogue/collections", "error", { code: errorCode(error) });
  }
  revalidatePath("/[locale]/admin/catalogue/collections", "page");
  done(locale, "/admin/catalogue/collections", "saved");
}

// ----- Products --------------------------------------------------------------

export async function saveProductAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = text(formData, "id");
  await requirePermission(id ? "product.update" : "product.create");
  const formPath = id ? `/admin/catalogue/products/${id}` : "/admin/catalogue/products/new";
  const sku = text(formData, "sku");
  const nameEn = text(formData, "nameEn");
  const nameUr = text(formData, "nameUr");
  const categoryId = text(formData, "categoryId");
  if (!sku || !nameEn || !nameUr || !isUuid(categoryId)) done(locale, formPath, "error", { code: "invalid" });

  const product: Record<string, unknown> = {
    sku, name_en: nameEn, name_ur: nameUr,
    description_en: text(formData, "descriptionEn"), description_ur: text(formData, "descriptionUr"),
    category_id: categoryId, brand_id: text(formData, "brandId"),
    unit_of_measure: text(formData, "unitOfMeasure") || "PCS",
    pack_size: quantity(text(formData, "packSize")) ?? "",
    loyalty_points_per_unit: String(Number.parseInt(text(formData, "loyaltyPoints") || "0", 10) || 0),
    stock_quantity: quantity(text(formData, "stockQuantity")) ?? "0",
    low_stock_threshold: quantity(text(formData, "lowStockThreshold")) ?? "0",
    is_active: formData.get("isActive") === "on",
    is_quote_only: formData.get("isQuoteOnly") === "on",
  };
  if (id) product.id = id;
  else {
    const price = decimal(text(formData, "pricePkr"));
    if (price === null) done(locale, formPath, "error", { code: "invalid" });
    product.price_pkr = price;
    product.compare_at_price_pkr = decimal(text(formData, "compareAtPricePkr")) ?? "";
  }
  const costRaw = text(formData, "costPkr");
  const canCost = costRaw ? await hasCurrentUserPermission("product.view_cost") : false;
  const cost = canCost ? decimal(costRaw) : null;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_catalogue_product", { p_product: product, p_cost_pkr: cost });
  if (error || !data) done(locale, formPath, "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue/products", "page");
  done(locale, `/admin/catalogue/products/${String(data)}`, "saved");
}

/** Called after the browser uploaded the file through /api/uploads/product. */
export async function setProductPrimaryImageAction(productId: string, storagePath: string) {
  await requirePermission("product.manage_images");
  if (!isUuid(productId) || !storagePath || storagePath.includes("..")) throw new Error("The image could not be attached.");
  const supabase = await getSupabaseServerClient();
  const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
  const { error } = await supabase.rpc("replace_product_primary_image", { p_product_id: productId, p_image_url: data.publicUrl });
  if (error) throw new Error("The image could not be attached. Try again.");
  revalidatePath("/[locale]/admin/catalogue/products/[productId]", "page");
}

export async function deleteProductImageAction(formData: FormData) {
  await requirePermission("product.manage_images");
  const locale = localeOf(formData);
  const productId = text(formData, "productId");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("product_images").delete().eq("id", text(formData, "imageId")).eq("product_id", productId);
  if (error) done(locale, `/admin/catalogue/products/${productId}`, "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue/products/[productId]", "page");
  done(locale, `/admin/catalogue/products/${productId}`, "saved");
}

// ----- Price lists -----------------------------------------------------------

export async function createPriceListAction(formData: FormData) {
  await requirePermission("pricelist.create");
  const locale = localeOf(formData);
  const name = text(formData, "name");
  const effective = text(formData, "effectiveFrom");
  if (!name || !effective) done(locale, "/admin/catalogue/price-lists", "error", { code: "invalid" });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_price_list_draft", {
    p_name: name,
    p_effective_from: karachiLocalToUtcIso(effective),
    p_clone_active: formData.get("cloneActive") === "on",
    p_notes: optional(formData, "notes"),
  });
  if (error || !data) done(locale, "/admin/catalogue/price-lists", "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue/price-lists", "page");
  done(locale, `/admin/catalogue/price-lists/${String(data)}`, "saved");
}

export async function setPriceListItemAction(formData: FormData) {
  await requirePermission("pricelist.create");
  const locale = localeOf(formData);
  const listId = text(formData, "priceListId");
  const path = `/admin/catalogue/price-lists/${listId}`;
  const back = { q: text(formData, "q") };
  const price = decimal(text(formData, "pricePkr"));
  if (price === null || !isUuid(text(formData, "productId"))) done(locale, path, "error", { code: "invalid", ...back });
  const costRaw = text(formData, "costPkr");
  const cost = costRaw && (await hasCurrentUserPermission("product.view_cost")) ? decimal(costRaw) : null;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_price_list_item", {
    p_price_list_id: listId,
    p_product_id: text(formData, "productId"),
    p_price_pkr: price,
    p_compare_at_price_pkr: decimal(text(formData, "compareAtPricePkr")),
    p_cost_pkr: cost,
  });
  if (error) done(locale, path, "error", { code: errorCode(error), ...back });
  revalidatePath("/[locale]/admin/catalogue/price-lists/[priceListId]", "page");
  done(locale, path, "saved", back);
}

export async function removePriceListItemAction(formData: FormData) {
  await requirePermission("pricelist.create");
  const locale = localeOf(formData);
  const listId = text(formData, "priceListId");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("remove_price_list_item", { p_price_list_id: listId, p_product_id: text(formData, "productId") });
  if (error) done(locale, `/admin/catalogue/price-lists/${listId}`, "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue/price-lists/[priceListId]", "page");
  done(locale, `/admin/catalogue/price-lists/${listId}`, "saved", { q: text(formData, "q") });
}

export async function reviewPriceListAction(formData: FormData) {
  await requirePermission("pricelist.activate");
  const locale = localeOf(formData);
  const listId = text(formData, "priceListId");
  const approve = text(formData, "decision") === "approve";
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("review_price_list", { p_price_list_id: listId, p_approve: approve, p_reason: optional(formData, "reason") });
  if (error) done(locale, `/admin/catalogue/price-lists/${listId}`, "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue/price-lists", "layout");
  done(locale, `/admin/catalogue/price-lists/${listId}`, approve ? "approved" : "rejected");
}

export async function activatePriceListAction(formData: FormData) {
  await requirePermission("pricelist.activate");
  const locale = localeOf(formData);
  const listId = text(formData, "priceListId");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("activate_price_list", { p_price_list_id: listId });
  if (error) done(locale, `/admin/catalogue/price-lists/${listId}`, "error", { code: errorCode(error) });
  revalidatePath("/[locale]/admin/catalogue", "layout");
  done(locale, `/admin/catalogue/price-lists/${listId}`, "activated");
}
