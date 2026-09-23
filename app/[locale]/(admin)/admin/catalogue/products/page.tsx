import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatPkr, formatQuantity, compareDecimal } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const PAGE_SIZE = 50;

export default async function AdminProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const category = one(sp.category);
  const brand = one(sp.brand);
  const status = one(sp.status);
  const page = Math.max(1, Number.parseInt(one(sp.page) || "1", 10) || 1);

  const supabase = await getSupabaseServerClient();
  let query = supabase.from("products").select("id,sku,name_en,name_ur,price_pkr,stock_quantity,low_stock_threshold,is_active,is_quote_only,category_id,brand_id", { count: "exact" });
  if (q) query = query.or(`sku.ilike.%${q.replace(/[%,()]/g, "")}%,name_en.ilike.%${q.replace(/[%,()]/g, "")}%,name_ur.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (/^[0-9a-f-]{36}$/i.test(category)) query = query.eq("category_id", category);
  if (/^[0-9a-f-]{36}$/i.test(brand)) query = query.eq("brand_id", brand);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  const [{ data: products, count, error }, categories, brands, canCreate] = await Promise.all([
    query.order("name_en").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("categories").select("id,name_en,name_ur").order("name_en"),
    supabase.from("brands").select("id,name_en,name_ur").order("name_en"),
    hasCurrentUserPermission("product.create"),
  ]);
  if (error) throw new Error(t("errors.saveFailed"));
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, locale === "ur" ? c.name_ur : c.name_en]));
  const brandName = new Map((brands.data ?? []).map((b) => [b.id, locale === "ur" ? b.name_ur : b.name_en]));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => { const p = new URLSearchParams(); if (q) p.set("q", q); if (category) p.set("category", category); if (brand) p.set("brand", brand); if (status) p.set("status", status); p.set("page", String(n)); return `/admin/catalogue/products?${p.toString()}`; };

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("catalogueTitle")}</Link>
      <PageHeader title={t("productsTitle")} description={t("productsDescription")} actions={canCreate ? <Link href="/admin/catalogue/products/new" className="inline-flex min-h-11 items-center rounded-md bg-[#D6202C] px-4 font-semibold text-white">{t("createProduct")}</Link> : null} />
      <form method="get" role="search" className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder={t("searchProducts")} aria-label={t("searchProducts")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" />
        <select name="category" defaultValue={category} aria-label={t("category")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">{t("allCategories")}</option>{(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{locale === "ur" ? c.name_ur : c.name_en}</option>)}</select>
        <select name="brand" defaultValue={brand} aria-label={t("brand")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">{t("allBrands")}</option>{(brands.data ?? []).map((b) => <option key={b.id} value={b.id}>{locale === "ur" ? b.name_ur : b.name_en}</option>)}</select>
        <select name="status" defaultValue={status} aria-label={ta("status")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">{ta("allStatuses")}</option><option value="active">{t("active")}</option><option value="inactive">{t("inactive")}</option></select>
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("search")}</button>
      </form>
      {(products ?? []).length === 0 ? <EmptyState title={t("noProducts")} action={canCreate ? <Link href="/admin/catalogue/products/new" className="inline-flex min-h-11 items-center rounded-md bg-[#D6202C] px-4 font-semibold text-white">{t("createProduct")}</Link> : undefined} /> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[820px]">
            <thead className="bg-[#F1F5F9] text-sm text-primary"><tr><th className="p-3 text-start">{t("sku")}</th><th className="p-3 text-start">{t("product")}</th><th className="p-3 text-start">{t("category")}</th><th className="p-3 text-start">{t("brand")}</th><th className="p-3 text-end">{t("pricePKR")}</th><th className="p-3 text-end">{t("stockQuantity")}</th><th className="p-3 text-start">{ta("status")}</th></tr></thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="p-3"><bdi>{p.sku}</bdi></td>
                  <td className="p-3"><Link href={`/admin/catalogue/products/${p.id}` as never} className="font-medium text-primary underline-offset-4 hover:underline">{locale === "ur" ? p.name_ur || p.name_en : p.name_en}</Link>{p.is_quote_only ? <span className="ms-2 text-sm text-muted-foreground">({t("quoteOnly")})</span> : null}</td>
                  <td className="p-3">{categoryName.get(p.category_id) ?? "—"}</td>
                  <td className="p-3">{p.brand_id ? brandName.get(p.brand_id) ?? "—" : t("unbranded")}</td>
                  <td className="p-3 text-end"><bdi>{formatPkr(p.price_pkr, { withSymbol: false })}</bdi></td>
                  <td className={`p-3 text-end ${compareDecimal(p.stock_quantity, p.low_stock_threshold) <= 0 ? "font-semibold text-[#D6202C]" : ""}`}><bdi>{formatQuantity(p.stock_quantity)}</bdi></td>
                  <td className="p-3">{p.is_active ? t("active") : t("inactive")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav className="flex items-center justify-between" aria-label={ta("pagination")}>
          {page > 1 ? <Link href={pageHref(page - 1) as never} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-primary">{ta("previous")}</Link> : <span />}
          <span className="text-sm text-muted-foreground">{ta("pageOf", { page, pages, total })}</span>
          {page < pages ? <Link href={pageHref(page + 1) as never} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-primary">{ta("next")}</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
