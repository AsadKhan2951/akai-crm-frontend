import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSalesOrder } from "@/lib/sales/orders";
import { formatKarachiDateTime, formatPkr, formatQuantity } from "@/lib/format/money";
import { EmptyState } from "@/components/ui-kit";
import { StatusBadge } from "@/components/vendor/StatusBadge";

export default async function SalesOrderPage({ params, searchParams }: { params: Promise<{ locale: string; orderId: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale, orderId } = await params;
  await requirePermission("order.view", { asNotFound: true });
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "salesOrders" });
  const tv = await getTranslations({ locale, namespace: "vendorPortal" });
  const back = <Link href="/sales/orders" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("title")}</Link>;
  const result = /^[0-9a-f-]{36}$/i.test(orderId) ? await getSalesOrder(orderId) : null;
  if (!result) return <div className="space-y-4">{back}<EmptyState title={t("notFound")} description={t("notFoundHint")} /></div>;
  const { order, lines } = result;
  const name = (line: (typeof lines)[number]) => (locale === "ur" ? line.product?.name_ur || line.product?.name_en : line.product?.name_en) || line.product?.sku || "—";
  return (
    <div className="space-y-5">
      {back}
      {sp.status === "placed" ? <p role="status" className="rounded-lg bg-good-soft px-3 py-2 text-[13.5px] font-medium text-good">{t("placedNotice")}</p> : null}
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12.5px] text-muted">{t("number")}</span>
          <h1 className="page-title text-[24px] font-bold"><bdi>{order.order_number}</bdi></h1>
          <span className="text-[13px] text-muted">
            {order.customer ? <Link href={`/sales/customers/${order.customer.id}` as never} className="font-semibold text-brand hover:underline">{order.customer.business_name}</Link> : "—"}
            {" · "}<bdi>{formatKarachiDateTime(order.placed_at ?? order.created_at, locale)}</bdi>
          </span>
        </div>
        <StatusBadge kind="order" status={order.status} />
      </header>
      {order.status === "PENDING_APPROVAL" ? <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13.5px] text-warn">{t("pendingNotice")}</p> : null}
      {order.status === "CANCELLED" && order.rejection_reason ? <p className="rounded-lg bg-bad-soft px-3 py-2 text-[13.5px] text-bad">{tv("rejectionReason")}: {order.rejection_reason}</p> : null}
      <section className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead className="bg-sunken text-xs text-muted">
            <tr><th className="px-4 py-2.5 text-start font-semibold">{tv("product")}</th><th className="px-3 py-2.5 text-end font-semibold">{t("quantity")}</th><th className="px-3 py-2.5 text-end font-semibold">{tv("unitPrice")}</th><th className="px-4 py-2.5 text-end font-semibold">{tv("lineTotal")}</th></tr>
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
            <tr className="border-t border-line"><td colSpan={3} className="px-4 py-3 text-end font-semibold">{t("total")}</td><td className="num px-4 py-3 text-end text-base font-bold">{formatPkr(order.total_pkr)}</td></tr>
          </tfoot>
        </table>
      </section>
      {order.notes ? <p className="rounded-[10px] border border-line bg-surface p-4 text-[13.5px]"><span className="font-semibold">{t("notes")}:</span> {order.notes}</p> : null}
    </div>
  );
}
