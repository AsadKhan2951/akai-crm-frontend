import { getTranslations } from "next-intl/server";
import { Boxes, Eye, FolderTree, Image as ImageIcon, Layers, ListOrdered, Tag, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUserPermissionKeys, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";

export default async function AdminCatalogueHub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const permissions = new Set(await getCurrentUserPermissionKeys());
  const supabase = await getSupabaseServerClient();
  const count = async (table: string) => {
    const { count: total } = await supabase.from(table).select("id", { count: "exact", head: true });
    return total ?? 0;
  };
  const [products, categories, brands, collections, priceLists] = await Promise.all([count("products"), count("categories"), count("brands"), count("collections"), permissions.has("pricelist.view") ? count("price_lists") : Promise.resolve(0)]);

  const cards = [
    { href: "/admin/catalogue/products", title: t("productsTitle"), description: t("productsDescription"), icon: Boxes, value: products, permission: "product.view" },
    { href: "/admin/catalogue/categories", title: t("categoriesTitle"), description: t("categoriesDescription"), icon: FolderTree, value: categories, permission: "category.view" },
    { href: "/admin/catalogue/brands", title: t("brandsTitle"), description: t("brandsDescription"), icon: Tag, value: brands, permission: "brand.view" },
    { href: "/admin/catalogue/collections", title: t("collectionsTitle"), description: t("collectionsDescription"), icon: Layers, value: collections, permission: "collection.view" },
    { href: "/admin/catalogue/price-lists", title: t("priceListsTitle"), description: t("priceListsDescription"), icon: ListOrdered, value: priceLists, permission: "pricelist.view" },
    { href: "/admin/catalogue/vendor-groups", title: t("vendorGroupsTitle"), description: t("vendorGroupsDescription"), icon: Users, permission: "vendorgroup.manage" },
    { href: "/admin/catalogue/visibility", title: t("visibilityTitle"), description: t("visibilityDescription"), icon: Eye, permission: "catalogvisibility.manage" },
    { href: "/admin/catalogue/banners", title: t("bannersTitle"), description: t("bannersDescription"), icon: ImageIcon, permission: "banner.manage" },
  ].filter((card) => permissions.has(card.permission));

  return (
    <div className="space-y-6">
      <PageHeader title={t("catalogueTitle")} description={t("catalogueDescription")} />
      {products === 0 ? <p className="rounded-md border border-slate-300 bg-white p-4 text-primary">{ta("gettingStarted")}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, description, icon: Icon, value }) => (
          <Link key={href} href={href as never} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 hover:border-primary">
            <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary" aria-hidden="true" />{value !== undefined ? <bdi className="text-2xl font-bold text-primary">{value}</bdi> : null}</div>
            <div><h2 className="text-lg font-semibold text-primary">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
