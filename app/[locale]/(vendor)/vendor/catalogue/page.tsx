import { getTranslations } from "next-intl/server";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getVendorCatalogue, localName, stockState, type NamedEntity } from "@/lib/vendor/queries";
import { compareDecimal } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { VendorCatalogue, type CatalogueFilters } from "./VendorCatalogue";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const decimalOrEmpty = (value: string) => (/^\d+(\.\d{1,2})?$/.test(value.trim()) ? value.trim() : "");

export default async function VendorCataloguePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorCatalogue" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={t("notConfigured")} description={t("notConfiguredHint")} />;

  const sp = await searchParams;
  const sort = one(sp.sort);
  const filters: CatalogueFilters = {
    q: one(sp.q).trim().slice(0, 100),
    category: one(sp.category),
    brand: one(sp.brand),
    collection: one(sp.collection),
    inStock: one(sp.stock) === "1",
    min: decimalOrEmpty(one(sp.min)),
    max: decimalOrEmpty(one(sp.max)),
    sort: sort === "price" || sort === "newest" ? sort : "name",
  };

  const [catalogue, canOrder, canQuote] = await Promise.all([getVendorCatalogue(customerId), hasCurrentUserPermission("order.create"), hasCurrentUserPermission("quote.create")]);

  let collectionProductIds: Set<string> | null = null;
  if (filters.collection) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.from("product_collections").select("product_id").eq("collection_id", filters.collection);
    collectionProductIds = new Set((data ?? []).map((row) => row.product_id as string));
  }

  const query = filters.q.toLowerCase();
  const filtered = catalogue.filter((p) => {
    if (filters.category && p.category_id !== filters.category) return false;
    if (filters.brand && p.brand_id !== filters.brand) return false;
    if (collectionProductIds && !collectionProductIds.has(p.id)) return false;
    if (filters.inStock && stockState(p) === "OUT_OF_STOCK") return false;
    if (filters.min && compareDecimal(p.price_pkr, filters.min) < 0) return false;
    if (filters.max && compareDecimal(p.price_pkr, filters.max) > 0) return false;
    if (query) {
      const haystack = [p.sku, p.name_en, p.name_ur, p.brand?.name_en, p.brand?.name_ur, p.category?.name_en, p.category?.name_ur].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => {
    if (filters.sort === "price") return compareDecimal(a.price_pkr, b.price_pkr);
    if (filters.sort === "newest") return b.created_at.localeCompare(a.created_at);
    return localName(a, locale).localeCompare(localName(b, locale), locale);
  });

  const uniq = (items: Array<NamedEntity | null>) => {
    const map = new Map<string, NamedEntity>();
    for (const item of items) if (item) map.set(item.id, item);
    return [...map.values()].sort((a, b) => localName(a, locale).localeCompare(localName(b, locale), locale));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <VendorCatalogue
        locale={locale}
        products={filtered.slice(0, 120)}
        total={filtered.length}
        categories={uniq(catalogue.map((p) => p.category))}
        brands={uniq(catalogue.map((p) => p.brand))}
        filters={filters}
        canOrder={canOrder}
        canQuote={canQuote}
      />
    </div>
  );
}
