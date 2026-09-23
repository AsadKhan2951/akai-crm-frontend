import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EntityManager, type EntityRow } from "../EntityManager";
import { CollectionProducts } from "./CollectionProducts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function AdminCollectionsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  await requirePermission("collection.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const sp = await searchParams;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("collections").select("id,name_en,name_ur,slug,image_url,display_order,is_active,description,starts_at,ends_at,product_collections(count)").order("display_order", { ascending: true }).order("name_en", { ascending: true });
  if (error) throw new Error(t("errors.saveFailed"));
  const rows: EntityRow[] = (data ?? []).map((row) => {
    const counted = (row as Record<string, unknown>)["product_collections"] as Array<{ count: number }> | undefined;
    return { ...(row as unknown as EntityRow), product_count: counted?.[0]?.count ?? 0 };
  });
  const [canCreate, canUpdate, canDelete] = await Promise.all([hasCurrentUserPermission("collection.manage"), hasCurrentUserPermission("collection.manage"), hasCurrentUserPermission("collection.manage")]);
  return (
    <div className="space-y-8">
      <EntityManager locale={locale} table="collections" title={t("collectionsTitle")} description={t("collectionsDescription")} rows={rows} createLabel={t("createCollection")} emptyLabel={t("noCollections")} status={one(sp.status)} code={one(sp.code)} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} q={one(sp.q)} />
      {canUpdate && rows.length ? <CollectionProducts locale={locale} collections={rows} selected={one(sp.collection)} /> : null}
    </div>
  );
}
