import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorProduct, localName, stockState } from "@/lib/vendor/queries";
import { formatPkr, formatQuantity } from "@/lib/format/money";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { AddToCartForm } from "@/components/vendor/AddToCartForm";

export default async function VendorProductPage({ params }: { params: Promise<{ locale: string; productId: string }> }) {
  const { locale, productId } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorCatalogue" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={t("notConfigured")} description={t("notConfiguredHint")} />;

  // Direct URLs go through the same visibility resolver as browsing; a hidden product is simply "not found".
  const result = /^[0-9a-f-]{36}$/i.test(productId) ? await getVendorProduct(customerId, productId) : null;
  const back = <Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{tp("backToCatalogue")}</Link>;
  if (!result) return <div className="space-y-4">{back}<EmptyState title={tp("productNotFound")} description={tp("productNotFoundHint")} /></div>;

  const { product, images } = result;
  const [canOrder, canQuote] = await Promise.all([hasCurrentUserPermission("order.create"), hasCurrentUserPermission("quote.create")]);
  const name = localName(product, locale) || t("fallbackName");
  const description = locale === "ur" ? product.description_ur || product.description_en : product.description_en || product.description_ur;
  const state = stockState(product);
  const stockLabel = { IN_STOCK: t("inStockLabel"), LOW_STOCK: t("lowStockLabel"), OUT_OF_STOCK: t("outOfStockLabel") }[state];
  const primary = images.find((img) => img.is_primary) ?? images[0];

  return (
    <div className="space-y-4">
      {back}
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label={t("imageGallery")} className="space-y-3">
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#F1F5F9]">
            {primary ? <img src={primary.url} alt={(locale === "ur" ? primary.alt_text_ur : primary.alt_text_en) || name} className="h-full w-full object-contain" /> : <span className="text-muted-foreground">{t("imageUnavailable")}</span>}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img) => <img key={img.id} src={img.url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-md border border-slate-200 object-contain" />)}
            </div>
          ) : null}
        </section>
        <section className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{[localName(product.brand, locale), localName(product.category, locale)].filter(Boolean).join(" · ")}</p>
            <h1 className="mt-1 text-2xl font-bold text-primary">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("sku")}: <bdi>{product.sku}</bdi></p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {product.is_quote_only ? <p className="text-lg font-semibold text-primary">{tp("quoteOnlyBadge")}</p> : (
              <p className="text-3xl font-bold text-primary"><bdi>{formatPkr(product.price_pkr)}</bdi></p>
            )}
            {!product.is_quote_only && product.compare_at_price_pkr ? <p className="text-sm text-muted-foreground line-through"><bdi>{formatPkr(product.compare_at_price_pkr)}</bdi></p> : null}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">{t("stockStatus")}</dt><dd className="font-semibold text-primary">{stockLabel}</dd>
              {product.pack_size ? <><dt className="text-muted-foreground">{t("packSize")}</dt><dd className="font-semibold text-primary"><bdi>{formatQuantity(product.pack_size)} {product.unit_of_measure}</bdi></dd></> : null}
              {product.loyalty_points_per_unit ? <><dt className="text-muted-foreground">{t("pointsEarned")}</dt><dd className="font-semibold text-primary"><bdi>{product.loyalty_points_per_unit}</bdi></dd></> : null}
            </dl>
            <div className="mt-4"><AddToCartForm productId={product.id} quoteOnly={product.is_quote_only} canOrder={canOrder} canQuote={canQuote} /></div>
          </div>
          <p className="whitespace-pre-line text-slate-700">{description || tp("noDescription")}</p>
        </section>
      </div>
    </div>
  );
}
