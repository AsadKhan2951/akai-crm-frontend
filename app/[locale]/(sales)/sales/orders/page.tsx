import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSalesOrders } from "@/lib/sales/orders";
import { formatKarachiDateTime, formatPkr } from "@/lib/format/money";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { StatusBadge } from "@/components/vendor/StatusBadge";

export default async function SalesOrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; status?: string }> }) {
  const { locale } = await params;
  await requirePermission("order.view", { asNotFound: true });
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "salesOrders" });
  const tv = await getTranslations({ locale, namespace: "vendorPortal" });
  const orders = await getSalesOrders(sp.q ?? "", sp.status ?? "");
  const statuses = ["PENDING_APPROVAL", "PLACED", "CONFIRMED", "PICKED", "DISPATCHED", "DELIVERED", "CANCELLED"];
  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Link href="/sales/orders/new" className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-[#2b2f37]">{t("newOrder")}</Link>} />
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={t("search")} aria-label={t("search")} className="h-10 min-w-0 flex-1" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label={t("status")} className="h-10">
          <option value="">{t("allStatuses")}</option>
          {statuses.map((s) => <option key={s} value={s}>{tv(`orderStatus.${s}` as never)}</option>)}
        </select>
        <button type="submit" className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-sunken">{t("filter")}</button>
      </form>
      {orders.length === 0 ? <EmptyState title={t("empty")} description={t("emptyHint")} /> : (
        <ul className="flex flex-col gap-2.5">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/sales/orders/${order.id}` as never} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] border border-line bg-surface px-4 py-3 hover:border-[#cfcdc6]">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{order.customer?.business_name ?? "—"}</span>
                  <span className="text-[12.5px] text-muted"><bdi>{order.order_number}</bdi> · <bdi>{formatKarachiDateTime(order.placed_at ?? order.created_at, locale)}</bdi></span>
                </span>
                <bdi className="num font-bold">{formatPkr(order.total_pkr)}</bdi>
                <StatusBadge kind="order" status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
