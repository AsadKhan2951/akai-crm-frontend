import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EntityRow } from "../EntityManager";
import { saveCollectionProductsAction } from "../actions";

export async function CollectionProducts({ locale, collections, selected }: { locale: string; collections: EntityRow[]; selected: string }) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const current = collections.find((c) => c.id === selected) ?? null;
  const supabase = await getSupabaseServerClient();
  const [products, members] = await Promise.all([
    current ? supabase.from("products").select("id,sku,name_en,name_ur,is_active").order("name_en").limit(1000) : Promise.resolve({ data: [] as Array<{ id: string; sku: string; name_en: string; name_ur: string; is_active: boolean }> }),
    current ? supabase.from("product_collections").select("product_id").eq("collection_id", current.id) : Promise.resolve({ data: [] as Array<{ product_id: string }> }),
  ]);
  const memberIds = new Set((members.data ?? []).map((m) => m.product_id));

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-primary">{t("collectionProducts")}</h2>
      <form method="get" className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="collection-pick">{ta("chooseCollection")}</label>
        <select id="collection-pick" name="collection" defaultValue={current?.id ?? ""} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3">
          <option value="">{ta("chooseCollection")}</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{locale === "ur" ? c.name_ur : c.name_en}</option>)}
        </select>
        <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-4 text-primary">{ta("open")}</button>
      </form>
      {current ? (
        <form action={saveCollectionProductsAction} className="space-y-3">
          <input type="hidden" name="collectionId" value={current.id} />
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm text-muted-foreground">{t("selectedCount", { count: memberIds.size })}</p>
          <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
            {(products.data ?? []).map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-3 rounded px-2 hover:bg-[#f1f0ec]">
                <input type="checkbox" name="productIds" value={p.id} defaultChecked={memberIds.has(p.id)} className="h-5 w-5" />
                <span className="text-primary">{locale === "ur" ? p.name_ur || p.name_en : p.name_en}</span>
                <bdi className="text-sm text-muted-foreground">{p.sku}</bdi>
              </label>
            ))}
          </div>
          <button type="submit" className="min-h-11 rounded-md bg-primary px-5 font-semibold text-white">{t("saveCollectionProducts")}</button>
        </form>
      ) : null}
    </section>
  );
}
