import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { setVisibilityRuleAction } from "../visibility-actions";

type Entity = { id: string; name_en: string; name_ur: string; sku?: string };

export default async function VisibilityPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requirePermission("catalogvisibility.manage", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "visibility" });
  const tc = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const [targetType, targetId] = (sp.target ?? "").split(":");
  const scopeType = (targetType || sp.scope) === "VENDOR" ? "VENDOR" : "GROUP";
  const rawId = targetId || sp.id || "";
  const scopeId = /^[0-9a-f-]{36}$/i.test(rawId) ? rawId : "";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const supabase = await getSupabaseServerClient();
  const [groups, customers] = await Promise.all([
    supabase.from("vendor_groups").select("id,name").order("name"),
    supabase.from("customers").select("id,business_name,area_code").eq("is_internal_account", false).order("business_name").limit(2000),
  ]);
  const label = (e: Entity) => (locale === "ur" ? e.name_ur || e.name_en : e.name_en);

  let body: React.ReactNode = null;
  if (scopeId) {
    let productQuery = supabase.from("products").select("id,sku,name_en,name_ur").eq("is_active", true).order("name_en").limit(50);
    if (q) productQuery = productQuery.or(`sku.ilike.%${q.replace(/[%,()]/g, "")}%,name_en.ilike.%${q.replace(/[%,()]/g, "")}%`);
    const [categories, brands, rules, count, products] = await Promise.all([
      supabase.from("categories").select("id,name_en,name_ur").order("name_en"),
      supabase.from("brands").select("id,name_en,name_ur").order("name_en"),
      supabase.from("catalog_visibility_rules").select("entity_type,entity_id,mode").eq("scope_type", scopeType).eq("scope_id", scopeId),
      supabase.rpc("visible_product_count_for_scope", { p_scope_type: scopeType, p_scope_id: scopeId }),
      q ? productQuery : Promise.resolve({ data: [] as Entity[] }),
    ]);
    const ruleMap = new Map((rules.data ?? []).map((r) => [`${r.entity_type}:${r.entity_id}`, r.mode as string]));
    const productRules = (rules.data ?? []).filter((r) => r.entity_type === "PRODUCT").map((r) => r.entity_id as string);
    const ruleButtons = (entityType: "CATEGORY" | "BRAND" | "PRODUCT", entity: Entity) => {
      const current = ruleMap.get(`${entityType}:${entity.id}`) ?? "";
      const button = (mode: "ALLOW" | "DENY" | "CLEAR", text: string) => (
        <form action={setVisibilityRuleAction}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="scopeType" value={scopeType} /><input type="hidden" name="scopeId" value={scopeId} />
          <input type="hidden" name="entityType" value={entityType} /><input type="hidden" name="entityId" value={entity.id} /><input type="hidden" name="mode" value={mode} /><input type="hidden" name="q" value={q} />
          <button type="submit" aria-pressed={current === mode || (mode === "CLEAR" && !current)} className={`min-h-11 rounded-md border px-3 text-sm ${current === mode ? (mode === "DENY" ? "border-[#b42318] bg-[#b42318] text-white" : "border-primary bg-primary text-white") : "border-slate-300 bg-white text-primary"}`}>{text}</button>
        </form>
      );
      return (
        <tr key={entity.id} className="border-t border-slate-100">
          <td className="p-3 text-primary">{label(entity)}{entity.sku ? <bdi className="ms-2 text-sm text-muted-foreground">{entity.sku}</bdi> : null}</td>
          <td className="p-3 text-sm text-muted-foreground">{current ? ta(`ruleMode.${current}` as never) : ta("ruleInherited")}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2">{button("ALLOW", t("allow"))}{button("DENY", ta("deny"))}{current ? button("CLEAR", t("clear")) : null}</div></td>
        </tr>
      );
    };
    const table = (title: string, entityType: "CATEGORY" | "BRAND" | "PRODUCT", rows: Entity[]) => (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("noProducts")}</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[560px]"><tbody>{rows.map((row) => ruleButtons(entityType, row))}</tbody></table></div>
        )}
      </section>
    );
    let overrideProducts: Entity[] = (products.data ?? []) as Entity[];
    if (!q && productRules.length) {
      const { data } = await supabase.from("products").select("id,sku,name_en,name_ur").in("id", productRules);
      overrideProducts = (data ?? []) as Entity[];
    }
    body = (
      <div className="space-y-6">
        <p className="rounded-md border border-slate-300 bg-white p-3 font-semibold text-primary">{t("visibleCount", { count: Number(count.data ?? 0) })}</p>
        <p className="text-sm text-muted-foreground">{t("matrixHint")}</p>
        {table(tc("categoriesTitle"), "CATEGORY", (categories.data ?? []) as Entity[])}
        {table(tc("brandsTitle"), "BRAND", (brands.data ?? []) as Entity[])}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">{t("productOverridesTab")}</h2>
          <form method="get" role="search" className="flex gap-2">
            <input type="hidden" name="target" value={`${scopeType}:${scopeId}`} />
            <input name="q" defaultValue={q} placeholder={t("searchProducts")} aria-label={t("searchProducts")} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("search")}</button>
          </form>
        </section>
        {overrideProducts.length ? table(q ? t("productOverridesTab") : ta("currentOverrides"), "PRODUCT", overrideProducts) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{tc("catalogueTitle")}</Link>
      <PageHeader title={t("title")} description={t("description")} />
      <FlashMessage status={sp.status} code={sp.code} />
      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <label className="min-w-64 flex-1 text-sm font-medium text-primary">{t("scope")}
          <select name="target" defaultValue={scopeId ? `${scopeType}:${scopeId}` : ""} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">
            <option value="">{ta("chooseScope")}</option>
            <optgroup label={t("group")}>{(groups.data ?? []).map((g) => <option key={g.id} value={`GROUP:${g.id}`}>{g.name}</option>)}</optgroup>
            <optgroup label={t("vendor")}>{(customers.data ?? []).map((c) => <option key={c.id} value={`VENDOR:${c.id}`}>{c.business_name} · {c.area_code}</option>)}</optgroup>
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("open")}</button>
      </form>
      <p className="text-sm text-muted-foreground">{ta("scopeHint")}</p>
      {scopeId ? body : <EmptyState title={ta("chooseScope")} description={ta("scopeHint")} />}
    </div>
  );
}
