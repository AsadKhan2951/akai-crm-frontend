import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorOrders } from "@/lib/vendor/queries";
import { formatKarachiDay, formatPkr } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { StatusBadge } from "@/components/vendor/StatusBadge";

export default async function VendorOrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  await requirePermission("order.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorOrders" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tCart = await getTranslations({ locale, namespace: "vendorCart" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={tCart("notConfigured")} description={tCart("notConfiguredHint")} />;
  const sp = await searchParams;
  const q = String((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().toLowerCase();
  const orders = (await getVendorOrders(customerId)).filter((o) => !q || String(o.order_number).toLowerCase().includes(q));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <form method="get" role="search" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={tp("searchOrders")} aria-label={tp("searchOrders")} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" />
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{tp("search")}</button>
      </form>
      {orders.length === 0 ? (
        <EmptyState title={t("noOrders")} description={t("noOrdersHint")} action={<Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md bg-[#D6202C] px-4 font-semibold text-white">{tp("browseCatalogue")}</Link>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/vendor/orders/${order.id}` as never} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-primary"><bdi>{order.order_number}</bdi></p>
                  <p className="text-sm text-muted-foreground"><bdi>{formatKarachiDay(order.placed_at, locale)}</bdi></p>
                </div>
                <div className="flex items-center gap-3">
                  <bdi className="font-semibold text-primary">{formatPkr(order.total_pkr)}</bdi>
                  <StatusBadge kind="order" status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
