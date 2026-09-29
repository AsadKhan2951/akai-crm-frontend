import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSalesOrder } from "@/lib/sales/orders";
import { formatKarachiDateTime, formatPkr, formatQuantity } from "@/lib/format/money";
import { STATUS_CLASS } from "@/lib/admin/order-status";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { OrderActions } from "@/components/admin/orders/OrderActions";

export default async function AdminOrderPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  await requirePermission("order.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "adminOrders" });
  const ts = await getTranslations({ locale, namespace: "salesOrders" });
  const tv = await getTranslations({ locale, namespace: "vendorPortal" });
  const back = <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("title")}</Link>;
  const [result, canUpdate, canApprove, canCancel] = await Promise.all([
    /^[0-9a-f-]{36}$/i.test(orderId) ? getSalesOrder(orderId) : Promise.resolve(null),
    hasCurrentUserPermission("order.update_status"),
    hasCurrentUserPermission("order.approve"),
    hasCurrentUserPermission("order.cancel"),
  ]);
  if (!result) return <div className="flex flex-col gap-4">{back}<EmptyState title={ts("notFound")} body={ts("notFoundHint")} /></div>;
  const { order, lines } = result;
  const name = (line: (typeof lines)[number]) => (locale === "ur" ? line.product?.name_ur || line.product?.name_en : line.product?.name_en) || line.product?.sku || "—";
  const showConfirm = order.status === "PLACED" && (canUpdate || canApprove);
  const showCancel = ["PENDING_APPROVAL", "PLACED", "CONFIRMED"].includes(order.status) && canCancel;
  const facts: Array<[string, React.ReactNode]> = [
    [t("cols.placed"), <bdi key="p">{formatKarachiDateTime(order.placed_at ?? order.created_at, locale)}</bdi>],
    [t("cols.via"), t(`via.${order.placed_via}` as never)],
    [t("payment"), order.payment_method ? t(`payment_${order.payment_method}` as never) : "—"],
  ];
  return (
    <div className="flex flex-col gap-5">
      {back}
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12.5px] text-muted">{ts("number")}</span>
          <h1 className="page-title text-[24px] font-bold"><bdi>{order.order_number}</bdi></h1>
          <span className="text-[13px] text-muted">{order.customer ? <Link href={`/admin/customers/${order.customer.id}` as never} className="font-semibold text-brand hover:underline">{order.customer.business_name}</Link> : "—"}</span>
        </div>
        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${STATUS_CLASS[order.status] ?? "bg-[#efeeea] text-ink-2"}`}>{tv(`orderStatus.${order.status}` as never)}</span>
      </header>

      {order.status === "PENDING_APPROVAL" ? <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13.5px] text-warn">{ts("pendingNotice")} <Link href="/admin/approvals" className="font-semibold underline">{t("openApprovals")}</Link></p> : null}
      {order.status === "PLACED" ? <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13.5px] text-warn">{t("placedHint")}</p> : null}
      {order.status === "CONFIRMED" ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-[13.5px] text-brand">{t("confirmedHint")} <Link href="/admin/delivery" className="font-semibold underline">{t("openDelivery")}</Link></p> : null}
      {order.status === "CANCELLED" && order.rejection_reason ? <p className="rounded-lg bg-bad-soft px-3 py-2 text-[13.5px] text-bad">{tv("rejectionReason")}: {order.rejection_reason}</p> : null}

      {showConfirm || showCancel ? <OrderActions orderId={order.id} canConfirm={showConfirm} canCancel={showCancel} labels={{
        confirm: t("confirm"), cancel: t("cancel"), reason: t("cancelReason"), cancelNow: t("cancelNow"), back: t("keepOrder"), confirmed: t("confirmedN", { n: 1 }), cancelled: t("cancelled"),
      }} /> : null}

      <dl className="grid gap-3 sm:grid-cols-3">
        {facts.map(([label, value]) => <div key={label} className="rounded-[10px] border border-line bg-surface px-4 py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 text-[14px] font-semibold">{value}</dd></div>)}
      </dl>

      <section className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead className="bg-sunken text-xs text-muted">
            <tr><th className="px-4 py-2.5 text-start font-semibold">{tv("product")}</th><th className="px-3 py-2.5 text-end font-semibold">{ts("quantity")}</th><th className="px-3 py-2.5 text-end font-semibold">{tv("unitPrice")}</th><th className="px-4 py-2.5 text-end font-semibold">{tv("lineTotal")}</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-line-soft">
                <td className="px-4 py-2.5"><span className="font-medium">{name(line)}</span> <bdi className="text-xs text-muted">{line.product?.sku}</bdi>{line.is_free_item ? <span className="ms-2 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">{tv("freeItem")}</span> : null}</td>
                <td className="num px-3 py-2.5 text-end">{formatQuantity(line.quantity)}</td>
                <td className="num px-3 py-2.5 text-end">{formatPkr(line.unit_price_pkr)}</td>
                <td className="num px-4 py-2.5 text-end font-semibold">{formatPkr(line.line_total_pkr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {Number(order.points_discount_pkr) > 0 ? <tr className="border-t border-line-soft"><td colSpan={3} className="px-4 py-2 text-end text-muted">{t("pointsDiscount")}</td><td className="num px-4 py-2 text-end">−{formatPkr(order.points_discount_pkr)}</td></tr> : null}
            <tr className="border-t border-line"><td colSpan={3} className="px-4 py-3 text-end font-semibold">{ts("total")}</td><td className="num px-4 py-3 text-end text-base font-bold">{formatPkr(order.total_pkr)}</td></tr>
          </tfoot>
        </table>
      </section>
      {order.notes ? <p className="rounded-[10px] border border-line bg-surface p-4 text-[13.5px]"><span className="font-semibold">{ts("notes")}:</span> {order.notes}</p> : null}
    </div>
  );
}
