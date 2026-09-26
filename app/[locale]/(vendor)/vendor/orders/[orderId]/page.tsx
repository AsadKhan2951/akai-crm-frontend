import { getTranslations } from "next-intl/server";
import { Check, ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorOrder, localName } from "@/lib/vendor/queries";
import { formatKarachiDateTime, formatPkr, formatQuantity } from "@/lib/format/money";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { StatusBadge } from "@/components/vendor/StatusBadge";
import { reorderVendorOrder } from "../../actions";

const progress = ["PLACED", "CONFIRMED", "DISPATCHED", "DELIVERED"] as const;
const rank: Record<string, number> = { DRAFT: -1, PENDING_APPROVAL: 0, PLACED: 0, CONFIRMED: 1, PICKED: 1, DISPATCHED: 2, DELIVERED: 3, CANCELLED: -1 };

export default async function VendorOrderPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  await requirePermission("order.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorOrders" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tCart = await getTranslations({ locale, namespace: "vendorCart" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={tCart("notConfigured")} description={tCart("notConfiguredHint")} />;
  const back = <Link href="/vendor/orders" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("title")}</Link>;
  const result = /^[0-9a-f-]{36}$/i.test(orderId) ? await getVendorOrder(customerId, orderId) : null;
  if (!result) return <div className="space-y-4">{back}<EmptyState title={t("orderNotFound")} description={t("orderNotFoundHint")} /></div>;
  const { order, lines } = result;
  const canOrder = await hasCurrentUserPermission("order.create");
  const current = rank[order.status] ?? -1;
  const stepLabel: Record<(typeof progress)[number], string> = { PLACED: order.approval_required ? t("approval") : t("placed"), CONFIRMED: t("confirmed"), DISPATCHED: t("dispatched"), DELIVERED: t("delivered") };

  return (
    <div className="space-y-6">
      {back}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("number")}</p>
          <h1 className="text-2xl font-bold text-primary"><bdi>{order.order_number}</bdi></h1>
          <p className="text-sm text-muted-foreground"><bdi>{formatKarachiDateTime(order.placed_at, locale)}</bdi> · {tp(`paymentMethod.${order.payment_method ?? "BALANCE"}` as never)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge kind="order" status={order.status} />
          {canOrder ? (
            <form action={reorderVendorOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="min-h-11 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white">{t("reorder")}</button>
            </form>
          ) : null}
        </div>
      </header>

      {order.status === "PENDING_APPROVAL" ? <p className="rounded-md border border-[#b42318] bg-white p-3 text-sm text-primary">{tCart("approvalNotice")}</p> : null}
      {order.status === "CANCELLED" && order.rejection_reason ? <p className="rounded-md border border-slate-300 bg-white p-3 text-sm text-primary">{tp("rejectionReason")}: {order.rejection_reason}</p> : null}

      {order.status !== "CANCELLED" ? (
        <section aria-label={t("timeline")}>
          <ol className="grid grid-cols-4 gap-2">
            {progress.map((step, index) => {
              const done = current >= index;
              return (
                <li key={step} className="flex flex-col items-center gap-2 text-center">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? "bg-primary text-white" : "border border-slate-300 bg-white text-slate-400"}`}>{done ? <Check className="h-4 w-4" aria-hidden="true" /> : <bdi>{index + 1}</bdi>}</span>
                  <span className={`text-sm ${done ? "font-semibold text-primary" : "text-muted-foreground"}`}>{stepLabel[step]}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-start">
          <thead className="bg-[#f1f0ec] text-sm text-primary">
            <tr><th className="p-3 text-start">{tp("product")}</th><th className="p-3 text-start">{tCart("quantity")}</th><th className="p-3 text-start">{tp("unitPrice")}</th><th className="p-3 text-start">{tp("lineTotal")}</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="p-3"><span className="font-medium text-primary">{localName(line.product, locale)}</span><br /><bdi className="text-sm text-muted-foreground">{line.product?.sku}</bdi>{line.is_free_item ? <span className="ms-2 rounded-full bg-[#b42318] px-2 py-0.5 text-sm text-white">{tp("freeItem")}</span> : null}</td>
                <td className="p-3"><bdi>{formatQuantity(line.quantity)}</bdi></td>
                <td className="p-3"><bdi>{formatPkr(line.unit_price_pkr)}</bdi></td>
                <td className="p-3 font-semibold"><bdi>{formatPkr(line.line_total_pkr)}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ms-auto max-w-sm rounded-lg border border-slate-200 bg-white p-4">
        <dl className="grid grid-cols-2 gap-2">
          {order.subtotal_pkr ? <><dt className="text-muted-foreground">{tCart("subtotal")}</dt><dd className="text-end"><bdi>{formatPkr(order.subtotal_pkr)}</bdi></dd></> : null}
          {order.discount_pkr && order.discount_pkr !== "0.00" ? <><dt className="text-muted-foreground">{tp("discount")}</dt><dd className="text-end"><bdi>-{formatPkr(order.discount_pkr)}</bdi></dd></> : null}
          {order.points_redeemed ? <><dt className="text-muted-foreground">{tCart("pointsRedemption")}</dt><dd className="text-end"><bdi>{order.points_redeemed}</bdi> · <bdi>-{formatPkr(order.points_discount_pkr)}</bdi></dd></> : null}
          <dt className="font-semibold text-primary">{t("total")}</dt><dd className="text-end text-lg font-bold text-primary"><bdi>{formatPkr(order.total_pkr)}</bdi></dd>
          {order.points_earned ? <><dt className="text-muted-foreground">{tCart("pointsToEarn")}</dt><dd className="text-end"><bdi>{order.points_earned}</bdi></dd></> : null}
        </dl>
        {order.notes ? <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700">{tCart("deliveryNotes")}: {order.notes}</p> : null}
      </section>
    </div>
  );
}
