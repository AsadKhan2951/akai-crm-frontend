import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toKarachiDateTimeLocal } from "@/lib/sales/time";
import { formatKarachiDateTime } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { createBannerAction, deleteBannerAction, toggleBannerAction } from "../visibility-actions";
import { BannerImageField } from "./BannerImageField";

const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

export default async function BannersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requirePermission("banner.manage", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "banners" });
  const tc = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const supabase = await getSupabaseServerClient();
  const [banners, products, categories, brands, collections, groups, customers] = await Promise.all([
    supabase.from("promo_banners").select("id,title_en,title_ur,image_url,link_type,cta_type,audience_type,display_order,starts_at,ends_at,is_active").order("display_order").order("starts_at", { ascending: false }).limit(100),
    supabase.from("products").select("id,sku,name_en").eq("is_active", true).order("name_en").limit(2000),
    supabase.from("categories").select("id,name_en").order("name_en"),
    supabase.from("brands").select("id,name_en").order("name_en"),
    supabase.from("collections").select("id,name_en").order("name_en"),
    supabase.from("vendor_groups").select("id,name").order("name"),
    supabase.from("customers").select("id,business_name,area_code").eq("is_internal_account", false).order("business_name").limit(2000),
  ]);
  const now = new Date();
  const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{tc("catalogueTitle")}</Link>
      <PageHeader title={t("title")} description={t("description")} />
      <FlashMessage status={sp.status} code={sp.code} />

      <details className="rounded-lg border border-slate-200 bg-white p-4" open={(banners.data ?? []).length === 0}>
        <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-primary">{t("createTitle")}</summary>
        <form action={createBannerAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm font-medium text-primary">{t("titleEn")}<input name="titleEn" required maxLength={80} className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("titleUr")}<input name="titleUr" required dir="rtl" maxLength={80} className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("subtitleEn")}<input name="subtitleEn" maxLength={140} className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("subtitleUr")}<input name="subtitleUr" dir="rtl" maxLength={140} className={input} /></label>
          <BannerImageField name="imageUrl" label={t("englishCreative")} required supabaseUrl={supabaseUrl} />
          <BannerImageField name="imageUrlUr" label={t("urduCreativeOptional")} supabaseUrl={supabaseUrl} />
          <label className="text-sm font-medium text-primary">{t("linkType")}
            <select name="linkType" defaultValue="NONE" className={input}><option value="NONE">{t("noLink")}</option><option value="PRODUCT">{t("product")}</option><option value="CATEGORY">{t("category")}</option><option value="BRAND">{t("brand")}</option><option value="COLLECTION">{t("collection")}</option><option value="EXTERNAL_URL">{t("externalUrl")}</option></select>
          </label>
          <label className="text-sm font-medium text-primary">{ta("linkTarget")}
            <select name="linkTargetId" defaultValue="" className={input}>
              <option value="">—</option>
              <optgroup label={t("product")}>{(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name_en}</option>)}</optgroup>
              <optgroup label={t("category")}>{(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}</optgroup>
              <optgroup label={t("brand")}>{(brands.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name_en}</option>)}</optgroup>
              <optgroup label={t("collection")}>{(collections.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}</optgroup>
            </select>
          </label>
          <label className="text-sm font-medium text-primary">{t("externalUrl")}<input name="externalUrl" type="url" placeholder="https://" className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("cta")}<select name="ctaType" defaultValue="VIEW" className={input}><option value="VIEW">{t("view")}</option><option value="BUY_NOW">{t("buyNow")}</option><option value="REQUEST_QUOTE">{t("requestQuote")}</option></select></label>
          <label className="text-sm font-medium text-primary">{t("audience")}<select name="audienceType" defaultValue="ALL" className={input}><option value="ALL">{t("allVendors")}</option><option value="GROUP">{t("vendorGroup")}</option><option value="SPECIFIC_VENDORS">{t("specificVendors")}</option></select></label>
          <label className="text-sm font-medium text-primary">{t("vendorGroup")}<select name="vendorGroupId" defaultValue="" className={input}><option value="">{t("selectGroup")}</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="text-sm font-medium text-primary md:col-span-2">{t("specificVendors")}
            <select name="customerIds" multiple className={`${input} min-h-32 py-2`}>{(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.business_name} · {c.area_code}</option>)}</select>
            <span className="mt-1 block text-sm font-normal text-muted-foreground">{ta("multiSelectHint")}</span>
          </label>
          <label className="text-sm font-medium text-primary">{t("startsAtKarachi")}<input name="startsAt" type="datetime-local" required defaultValue={toKarachiDateTimeLocal(now)} className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("endsAtKarachi")}<input name="endsAt" type="datetime-local" required defaultValue={toKarachiDateTimeLocal(inWeek)} className={input} /></label>
          <label className="text-sm font-medium text-primary">{ta("displayOrder")}<input name="displayOrder" type="number" min={0} defaultValue={0} className={input} /></label>
          <p className="text-sm text-muted-foreground md:col-span-2">{t("scheduleHint")}</p>
          <div className="md:col-span-2"><button type="submit" className="min-h-11 rounded-md bg-[#D6202C] px-5 font-semibold text-white">{t("saveBanner")}</button></div>
        </form>
      </details>

      {(banners.data ?? []).length === 0 ? <EmptyState title={t("noBanners")} /> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(banners.data ?? []).map((b) => (
            <li key={b.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img src={b.image_url} alt="" className="h-36 w-full object-cover" loading="lazy" />
              <div className="space-y-2 p-4">
                <p className="font-semibold text-primary">{locale === "ur" ? b.title_ur : b.title_en}</p>
                <p className="text-sm text-muted-foreground"><bdi>{formatKarachiDateTime(b.starts_at, locale)}</bdi> → <bdi>{formatKarachiDateTime(b.ends_at, locale)}</bdi></p>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${b.is_active ? "bg-primary text-white" : "bg-slate-200 text-slate-700"}`}>{b.is_active ? tc("active") : tc("inactive")}</span>
                  <form action={toggleBannerAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={b.id} /><input type="hidden" name="isActive" value={String(!b.is_active)} /><button type="submit" className="min-h-11 rounded-md border border-slate-300 px-3 text-primary">{b.is_active ? t("deactivate") : t("activate")}</button></form>
                  <form action={deleteBannerAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={b.id} /><button type="submit" className="min-h-11 px-3 text-[#D6202C] underline-offset-4 hover:underline">{tc("delete")}</button></form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
