import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSalesOrders } from "@/lib/sales/orders";
import { formatKarachiDateTime, formatPkr } from "@/lib/format/money";
import { ORDER_STATUSES, STATUS_CLASS } from "@/lib/admin/order-status";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

export default async function AdminOrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ search?: string; status?: string }> }) {
  await requirePermission("order.view", { asNotFound: true });
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "adminOrders" });
  const tv = await getTranslations({ locale, namespace: "vendorPortal" });
  const [orders, canUpdate, canApprove] = await Promise.all([
    getSalesOrders(query.search ?? "", query.status ?? "", 300),
    hasCurrentUserPermission("order.update_status"),
    hasCurrentUserPermission("order.approve"),
  ]);
  const placedCount = orders.filter((o) => o.status === "PLACED").length;
  const rows = orders.map((o) => ({
    id: o.id,
    number: o.order_number,
    customer: o.customer?.business_name ?? "—",
    area: o.customer?.area_code ?? "",
    when: formatKarachiDateTime(o.placed_at ?? o.created_at, locale),
    total: formatPkr(o.total_pkr),
    status: o.status,
    statusLabel: tv(`orderStatus.${o.status}` as never),
    statusClass: STATUS_CLASS[o.status] ?? "bg-[#efeeea] text-ink-2",
    via: t(`via.${o.placed_via}` as never),
  }));
  return (
    <>
      <PageHeader title={t("title")} subtitle={placedCount ? t("subtitleWaiting", { n: placedCount }) : t("subtitle")} />
      <div className="flex flex-col gap-4">
        <form method="get" className="flex flex-wrap gap-2" role="search">
          <input name="search" defaultValue={query.search ?? ""} placeholder={t("search")} aria-label={t("search")} className="h-10 min-w-0 flex-1" />
          <select name="status" defaultValue={query.status ?? ""} aria-label={t("status")} className="h-10">
            <option value="">{t("allStatuses")}</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{tv(`orderStatus.${s}` as never)}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-sunken">{t("filter")}</button>
        </form>
        {rows.length === 0 ? <EmptyState title={t("empty")} body={t("emptyHint")} /> : (
          <OrdersTable rows={rows} canConfirm={canUpdate || canApprove} labels={{
            order: t("cols.order"), customer: t("cols.customer"), placed: t("cols.placed"), total: t("cols.total"), status: t("cols.status"), via: t("cols.via"),
            selectAll: t("selectAllPlaced"),
          }} />
        )}
      </div>
    </>
  );
}
