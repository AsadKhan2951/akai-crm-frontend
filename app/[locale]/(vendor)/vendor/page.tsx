import { getTranslations } from "next-intl/server";
import { Boxes, Gift, ListTodo, MessageSquareQuote, Tag, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorCustomer, getVendorHome } from "@/lib/vendor/queries";
import { formatPkr } from "@/lib/format/money";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { BannerCarousel } from "@/components/vendor/BannerCarousel";
import { AddToCartForm } from "@/components/vendor/AddToCartForm";

export default async function VendorHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission("product.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorHome" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tPdf = await getTranslations({ locale, namespace: "vendorPdf" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={t("noVendor")} description={t("noVendorHint")} />;

  const [customer, home, canOrder] = await Promise.all([getVendorCustomer(customerId), getVendorHome(customerId), hasCurrentUserPermission("order.create")]);
  const name = customer ? (locale === "ur" ? customer.business_name_urdu || customer.business_name : customer.business_name) : "";

  const cards = [
    { href: "/vendor/catalogue", label: t("placeOrder"), icon: Boxes, accent: true },
    { href: "/vendor/orders", label: t("myOrders"), icon: ListTodo },
    { href: "/vendor/points", label: t("myPoints"), icon: Gift, value: customer ? String(customer.loyalty_points_balance ?? 0) : undefined },
    { href: "/vendor/balance", label: t("myBalance"), icon: Wallet, value: customer ? formatPkr(customer.current_balance_pkr) : undefined },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{t("title")}</p>
        <h1 className="text-2xl font-bold text-primary">{tp("welcome", { name })}</h1>
      </header>

      <BannerCarousel banners={home.banners} />

      <nav className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t("title")}>
        {cards.map(({ href, label, icon: Icon, accent, value }) => (
          <Link key={href} href={href as never} className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 ${accent ? "border-[#D6202C] bg-[#D6202C] text-white" : "border-slate-200 bg-white text-primary"}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
            <span>
              <span className="block text-lg font-semibold">{label}</span>
              {value ? <bdi className={`text-sm ${accent ? "text-white" : "text-muted-foreground"}`}>{value}</bdi> : null}
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link href="/vendor/quotes" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-primary"><MessageSquareQuote className="h-4 w-4" aria-hidden="true" />{tp("myQuotes")}</Link>
        <Link href="/vendor/offers" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-primary"><Tag className="h-4 w-4" aria-hidden="true" />{tp("offers")}</Link>
        <a href={`/api/vendor/catalogue-pdf?locale=${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-primary">{tPdf("download")}</a>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-primary">{t("reorder")}</h2>
          <p className="text-sm text-muted-foreground">{t("reorderHint")}</p>
        </div>
        {home.reorders.length === 0 ? (
          <EmptyState title={t("noReorders")} action={<Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{t("browseCatalogue")}</Link>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {home.reorders.map((item) => (
              <article key={item.product_id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <Link href={`/vendor/catalogue/${item.product_id}` as never} className="font-semibold text-primary underline-offset-4 hover:underline">{locale === "ur" ? item.name_ur || item.name_en : item.name_en}</Link>
                <p className="text-sm text-muted-foreground">{tp("timesOrdered", { count: Number(item.times_ordered) })}</p>
                <AddToCartForm productId={item.product_id} quoteOnly={false} canOrder={canOrder} compact />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
