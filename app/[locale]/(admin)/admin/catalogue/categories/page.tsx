import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EntityManager, type EntityRow } from "../EntityManager";


type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function AdminCategoriesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  await requirePermission("category.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const sp = await searchParams;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("id,name_en,name_ur,slug,image_url,display_order,is_active,description,notes,products(count)").order("display_order", { ascending: true }).order("name_en", { ascending: true });
  if (error) throw new Error(t("errors.saveFailed"));
  const rows: EntityRow[] = (data ?? []).map((row) => {
    const counted = (row as Record<string, unknown>)["products"] as Array<{ count: number }> | undefined;
    return { ...(row as unknown as EntityRow), product_count: counted?.[0]?.count ?? 0 };
  });
  const [canCreate, canUpdate, canDelete] = await Promise.all([hasCurrentUserPermission("category.create"), hasCurrentUserPermission("category.update"), hasCurrentUserPermission("category.delete")]);
  return (
    <div className="space-y-8">
      <EntityManager locale={locale} table="categories" title={t("categoriesTitle")} description={t("categoriesDescription")} rows={rows} createLabel={t("createCategory")} emptyLabel={t("noCategories")} status={one(sp.status)} code={one(sp.code)} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} q={one(sp.q)} />

    </div>
  );
}
