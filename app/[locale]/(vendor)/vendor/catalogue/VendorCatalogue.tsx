import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPkr, formatQuantity } from "@/lib/format/money";
import { localName, stockState, type CatalogueProduct, type NamedEntity } from "@/lib/vendor/queries";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { AddToCartForm } from "@/components/vendor/AddToCartForm";

export type CatalogueFilters = { q: string; category: string; brand: string; collection: string; inStock: boolean; min: string; max: string; sort: "name" | "price" | "newest" };

const stockClass: Record<string, string> = {
  IN_STOCK: "bg-slate-100 text-primary",
  LOW_STOCK: "border border-[#b42318] bg-white text-[#b42318]",
  OUT_OF_STOCK: "bg-[#b42318] text-white",
};

/** Server component: renders the vendor catalogue for an already visibility-resolved product list. */
export async function VendorCatalogue({ locale, products, total, categories, brands, filters, canOrder, canQuote }: {
  locale: string;
  products: CatalogueProduct[];
  total: number;
  categories: NamedEntity[];
  brands: NamedEntity[];
  filters: CatalogueFilters;
  canOrder: boolean;
  canQuote: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "vendorCatalogue" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tPdf = await getTranslations({ locale, namespace: "vendorPdf" });
  const stockLabel = { IN_STOCK: t("inStockLabel"), LOW_STOCK: t("lowStockLabel"), OUT_OF_STOCK: t("outOfStockLabel") } as const;
  const chip = (active: boolean) => `inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-primary"}`;
  const withParam = (key: string, value: string) => {
    const params = new URLSearchParams();
    const merged: Record<string, string> = { q: filters.q, category: filters.category, brand: filters.brand, min: filters.min, max: filters.max, sort: filters.sort === "name" ? "" : filters.sort, stock: filters.inStock ? "1" : "", [key]: value };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const query = params.toString();
    return `/vendor/catalogue${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <p className="flex-1 text-sm text-muted-foreground">{tPdf("description")}</p>
        <a href={`/api/vendor/catalogue-pdf?locale=${locale}`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-primary">{tPdf("download")}</a>
        <a href={`/api/vendor/catalogue-pdf?locale=${locale}&share=whatsapp`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{tPdf("shareWhatsApp")}</a>
      </div>
      <form method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
        <label className="sr-only" htmlFor="catalogue-search">{t("search")}</label>
        <input id="catalogue-search" name="q" defaultValue={filters.q} placeholder={t("search")} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" />
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {filters.brand ? <input type="hidden" name="brand" value={filters.brand} /> : null}
        <button type="submit" className="min-h-11 rounded-md bg-primary px-5 font-semibold text-white">{t("searchAction")}</button>
      </form>

      {categories.length ? (
        <section aria-label={t("browseByCategory")} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("browseByCategory")}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href={withParam("category", "") as never} className={chip(!filters.category)}>{t("allCategories")}</Link>
            {categories.map((c) => <Link key={c.id} href={withParam("category", c.id) as never} className={chip(filters.category === c.id)}>{localName(c, locale)}</Link>)}
          </div>
        </section>
      ) : null}
      {brands.length ? (
        <section aria-label={t("browseByBrand")} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("browseByBrand")}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href={withParam("brand", "") as never} className={chip(!filters.brand)}>{t("allBrands")}</Link>
            {brands.map((b) => <Link key={b.id} href={withParam("brand", b.id) as never} className={chip(filters.brand === b.id)}>{localName(b, locale)}</Link>)}
          </div>
        </section>
      ) : null}

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">{t("filters")}</summary>
        <form method="get" className="mt-3 grid gap-3 md:grid-cols-4">
          {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          {filters.brand ? <input type="hidden" name="brand" value={filters.brand} /> : null}
          <label className="text-sm font-medium text-primary">{t("minPrice")}<input name="min" inputMode="decimal" defaultValue={filters.min} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
          <label className="text-sm font-medium text-primary">{t("maxPrice")}<input name="max" inputMode="decimal" defaultValue={filters.max} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
          <label className="text-sm font-medium text-primary">{t("sort")}
            <select name="sort" defaultValue={filters.sort} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">
              <option value="name">{t("sortName")}</option><option value="price">{t("sortPrice")}</option><option value="newest">{t("sortNewest")}</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-primary"><input type="checkbox" name="stock" value="1" defaultChecked={filters.inStock} className="h-5 w-5" />{t("inStockOnly")}</label>
          <div className="flex gap-2 md:col-span-4">
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{t("applyFilters")}</button>
            <Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-primary">{t("clearFilters")}</Link>
          </div>
        </form>
      </details>

      <p className="text-sm text-muted-foreground">{tp("resultsCount", { shown: products.length, total })}</p>

      {products.length === 0 ? <EmptyState title={t("noResults")} description={t("noResultsHint")} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const state = stockState(product);
            const name = localName(product, locale) || t("fallbackName");
            return (
              <article key={product.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Link href={`/vendor/catalogue/${product.id}` as never} className="block bg-[#f1f0ec]">
                  {product.image_url ? <img src={product.image_url} alt={name} loading="lazy" className="h-44 w-full object-contain" /> : <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">{t("imageUnavailable")}</div>}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-sm text-muted-foreground">{[localName(product.brand, locale), localName(product.category, locale)].filter(Boolean).join(" · ")}</p>
                  <Link href={`/vendor/catalogue/${product.id}` as never} className="font-semibold text-primary underline-offset-4 hover:underline">{name}</Link>
                  <p className="text-sm text-muted-foreground">{t("sku")}: <bdi>{product.sku}</bdi>{product.pack_size ? <> · {t("packSize")}: <bdi>{formatQuantity(product.pack_size)} {product.unit_of_measure}</bdi></> : null}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {product.is_quote_only ? <span className="font-semibold text-primary">{tp("quoteOnlyBadge")}</span> : <bdi className="text-lg font-bold text-primary">{formatPkr(product.price_pkr)}</bdi>}
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${stockClass[state]}`}>{stockLabel[state]}</span>
                  </div>
                  <div className="mt-auto pt-2"><AddToCartForm productId={product.id} quoteOnly={product.is_quote_only} canOrder={canOrder} canQuote={canQuote} compact /></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
