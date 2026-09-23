import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requirePermission("product.create", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const supabase = await getSupabaseServerClient();
  const [categories, brands, canViewCost] = await Promise.all([
    supabase.from("categories").select("id,name_en,name_ur").eq("is_active", true).order("name_en"),
    supabase.from("brands").select("id,name_en,name_ur").eq("is_active", true).order("name_en"),
    hasCurrentUserPermission("product.view_cost"),
  ]);
  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue/products" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("productsTitle")}</Link>
      <PageHeader title={t("createProduct")} description={t("productImportPriceNote")} />
      <FlashMessage status={sp.status} code={sp.code} />
      {(categories.data ?? []).length === 0 ? (
        <EmptyState title={ta("needCategoryFirst")} action={<Link href="/admin/catalogue/categories" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{t("createCategory")}</Link>} />
      ) : (
        <ProductForm locale={locale} categories={categories.data ?? []} brands={brands.data ?? []} canViewCost={canViewCost} />
      )}
    </div>
  );
}
