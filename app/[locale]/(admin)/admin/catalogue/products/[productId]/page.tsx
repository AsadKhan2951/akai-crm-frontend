import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { ProductForm, type ProductFormValues } from "../ProductForm";
import { ProductImageUploader } from "../ProductImageUploader";
import { deleteProductImageAction } from "../../actions";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ locale: string; productId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, productId } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const sp = await searchParams;
  const back = <Link href="/admin/catalogue/products" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("productsTitle")}</Link>;
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return <div className="space-y-4">{back}<EmptyState title={t("noProducts")} /></div>;
  const supabase = await getSupabaseServerClient();
  const [canViewCost, canUpdate, canImages] = await Promise.all([hasCurrentUserPermission("product.view_cost"), hasCurrentUserPermission("product.update"), hasCurrentUserPermission("product.manage_images")]);
  const [product, images, categories, brands, cost] = await Promise.all([
    supabase.from("products").select("id,sku,name_en,name_ur,description_en,description_ur,category_id,brand_id,unit_of_measure,pack_size,price_pkr,compare_at_price_pkr,loyalty_points_per_unit,stock_quantity,low_stock_threshold,is_active,is_quote_only").eq("id", productId).maybeSingle(),
    supabase.from("product_images").select("id,url,is_primary,display_order").eq("product_id", productId).order("is_primary", { ascending: false }).order("display_order"),
    supabase.from("categories").select("id,name_en,name_ur").order("name_en"),
    supabase.from("brands").select("id,name_en,name_ur").order("name_en"),
    canViewCost ? supabase.from("product_costs").select("cost_pkr").eq("product_id", productId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!product.data) return <div className="space-y-4">{back}<EmptyState title={t("noProducts")} /></div>;
  const values = product.data as unknown as ProductFormValues;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader title={locale === "ur" ? values.name_ur || values.name_en : values.name_en} description={values.sku} />
      <FlashMessage status={sp.status} code={sp.code} />
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">{t("images")}</h2>
        <div className="flex flex-wrap gap-3">
          {(images.data ?? []).map((img) => (
            <figure key={img.id} className="w-32 space-y-1">
              <img src={img.url} alt="" className="h-32 w-32 rounded-md border border-slate-200 object-contain" />
              <figcaption className="flex items-center justify-between text-sm">
                {img.is_primary ? <span className="font-semibold text-primary">{t("primary")}</span> : <span />}
                {canImages ? <form action={deleteProductImageAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="imageId" value={img.id} /><button type="submit" className="min-h-11 px-1 text-[#D6202C] underline-offset-4 hover:underline">{t("remove")}</button></form> : null}
              </figcaption>
            </figure>
          ))}
        </div>
        {canImages ? <ProductImageUploader productId={productId} /> : null}
      </section>
      {canUpdate ? <ProductForm locale={locale} product={values} cost={(cost.data as { cost_pkr?: string } | null)?.cost_pkr ?? null} categories={categories.data ?? []} brands={brands.data ?? []} canViewCost={canViewCost} /> : null}
    </div>
  );
}
