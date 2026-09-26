import { getTranslations } from "next-intl/server";
import { formatPkr, formatQuantity } from "@/lib/format/money";
import { saveProductAction } from "../actions";

export type ProductFormValues = {
  id: string; sku: string; name_en: string; name_ur: string; description_en: string | null; description_ur: string | null;
  category_id: string; brand_id: string | null; unit_of_measure: string; pack_size: string | null; price_pkr: string; compare_at_price_pkr: string | null;
  loyalty_points_per_unit: number | null; stock_quantity: string | null; low_stock_threshold: string | null; is_active: boolean | null; is_quote_only: boolean | null;
};
type Option = { id: string; name_en: string; name_ur: string };
const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

export async function ProductForm({ locale, product, cost, categories, brands, canViewCost }: { locale: string; product?: ProductFormValues; cost?: string | null; categories: Option[]; brands: Option[]; canViewCost: boolean }) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const label = (o: Option) => (locale === "ur" ? o.name_ur || o.name_en : o.name_en);
  return (
    <form action={saveProductAction} className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
      <input type="hidden" name="locale" value={locale} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold text-primary">{ta("basics")}</legend>
        <label className="text-sm font-medium text-primary">{t("sku")}<input name="sku" required defaultValue={product?.sku} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("unitOfMeasure")}<input name="unitOfMeasure" defaultValue={product?.unit_of_measure ?? "PCS"} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("nameEn")}<input name="nameEn" required defaultValue={product?.name_en} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("nameUr")}<input name="nameUr" required dir="rtl" defaultValue={product?.name_ur} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("category")}
          <select name="categoryId" required defaultValue={product?.category_id ?? ""} className={input}><option value="">{t("selectCategory")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-primary">{t("brand")}
          <select name="brandId" defaultValue={product?.brand_id ?? ""} className={input}><option value="">{t("unbranded")}</option>{brands.map((b) => <option key={b.id} value={b.id}>{label(b)}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-primary md:col-span-2">{t("descriptionEn")}<textarea name="descriptionEn" defaultValue={product?.description_en ?? ""} className={`${input} min-h-24 py-2`} /></label>
        <label className="text-sm font-medium text-primary md:col-span-2">{t("descriptionUr")}<textarea name="descriptionUr" dir="rtl" defaultValue={product?.description_ur ?? ""} className={`${input} min-h-24 py-2`} /></label>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold text-primary">{ta("pricingStock")}</legend>
        {product ? (
          <div className="rounded-md bg-[#f1f0ec] p-3 md:col-span-3">
            <p className="text-sm text-muted-foreground">{t("currentPrice")}</p>
            <p className="text-xl font-bold text-primary"><bdi>{formatPkr(product.price_pkr)}</bdi></p>
            <p className="text-sm text-muted-foreground">{ta("priceViaPriceList")}</p>
          </div>
        ) : (
          <>
            <label className="text-sm font-medium text-primary">{t("pricePKR")}<input name="pricePkr" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={input} /></label>
            <label className="text-sm font-medium text-primary">{t("compareAtPricePKR")}<input name="compareAtPricePkr" inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={input} /></label>
          </>
        )}
        {canViewCost ? <label className="text-sm font-medium text-primary">{t("costPKR")}<input name="costPkr" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={cost ?? ""} className={input} /></label> : null}
        <label className="text-sm font-medium text-primary">{t("packSize")}<input name="packSize" inputMode="decimal" defaultValue={product?.pack_size ? formatQuantity(product.pack_size) : ""} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("stockQuantity")}<input name="stockQuantity" inputMode="decimal" defaultValue={formatQuantity(product?.stock_quantity ?? "0")} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("lowStockThreshold")}<input name="lowStockThreshold" inputMode="decimal" defaultValue={formatQuantity(product?.low_stock_threshold ?? "0")} className={input} /></label>
        <label className="text-sm font-medium text-primary">{t("loyaltyPoints")}<input name="loyaltyPoints" type="number" min={0} defaultValue={product?.loyalty_points_per_unit ?? 0} className={input} /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="isActive" defaultChecked={product ? product.is_active !== false : true} className="h-5 w-5" />{t("active")}</label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="isQuoteOnly" defaultChecked={Boolean(product?.is_quote_only)} className="h-5 w-5" />{t("quoteOnly")}</label>
      </fieldset>
      <button type="submit" className="min-h-12 rounded-lg bg-brand hover:bg-[#1a3ca8] px-6 text-lg font-semibold text-white">{product ? t("saveChanges") : t("createProduct")}</button>
    </form>
  );
}
