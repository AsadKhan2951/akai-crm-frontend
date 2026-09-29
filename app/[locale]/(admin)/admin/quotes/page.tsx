import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getAdminQuotes } from "@/lib/admin/queries";
import { getSalesQuoteQueue } from "@/lib/sales/queries";
import { formatKarachiDateTime } from "@/lib/format/money";
import { STATUS_CLASS } from "@/lib/admin/order-status";
import { Link } from "@/i18n/navigation";
import { QuoteQueue } from "../../../(sales)/sales/quotes/QuoteQueue";

const QUOTE_STATUSES = ["REQUESTED", "IN_REVIEW", "QUOTED", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"] as const;

/** Admin quotes: the pricing queue (requested quotes) on top, then every quote with its status. */
export default async function AdminQuotesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ search?: string; status?: string }> }) {
  await requirePermission("quote.view", { asNotFound: true });
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "adminOrders" });
  const ta = await getTranslations({ locale, namespace: "admin" });
  const tv = await getTranslations({ locale, namespace: "vendorPortal" });
  const canPrice = await hasCurrentUserPermission("quote.price");
  const [queue, rows] = await Promise.all([canPrice ? getSalesQuoteQueue() : Promise.resolve(null), getAdminQuotes(query.search ?? "", query.status ?? "")]);
  return (
    <div className="flex flex-col gap-6">
      {queue ? <QuoteQueue quotes={queue.quotes as never} rates={queue.rates as never} /> : null}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] font-bold">{ta("quotesTitle")}</h2>
          <p className="text-[13px] text-muted">{ta("quotesDescription")}</p>
        </div>
        <form method="get" className="flex flex-wrap gap-2" role="search">
          <input name="search" defaultValue={query.search ?? ""} placeholder={ta("search")} aria-label={ta("search")} className="h-10 min-w-0 flex-1" />
          <select name="status" defaultValue={query.status ?? ""} aria-label={t("status")} className="h-10">
            <option value="">{t("allStatuses")}</option>
            {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{tv(`quoteStatus.${s}` as never)}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-sunken">{t("filter")}</button>
        </form>
        {rows.length ? (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[680px] text-[13.5px]">
              <thead className="bg-sunken text-xs text-muted"><tr>
                <th className="px-3 py-2.5 text-start font-semibold">{ta("quotesTitle")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("cols.customer")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("cols.placed")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{tv("validUntil")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("cols.status")}</th>
              </tr></thead>
              <tbody>
                {rows.map((q) => {
                  const customer = (Array.isArray(q.customer) ? q.customer[0] : q.customer) as { business_name?: string; area_code?: string } | null;
                  return (
                    <tr key={q.id} className="border-t border-line-soft">
                      <td className="px-3 py-2.5 font-semibold"><bdi>{q.quote_number}</bdi>{q.converted_order_id ? <Link href={`/admin/orders/${q.converted_order_id}` as never} className="ms-2 text-xs font-semibold text-brand hover:underline">{t("cols.order")}</Link> : null}</td>
                      <td className="px-3 py-2.5">{customer?.business_name ?? "—"}{customer?.area_code ? <span className="ms-1.5 text-xs text-muted"><bdi>{customer.area_code}</bdi></span> : null}</td>
                      <td className="px-3 py-2.5 text-ink-2"><bdi>{formatKarachiDateTime(q.created_at, locale)}</bdi></td>
                      <td className="px-3 py-2.5 text-ink-2"><bdi>{q.valid_until ? formatKarachiDateTime(q.valid_until, locale) : "—"}</bdi></td>
                      <td className="px-3 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[q.status] ?? "bg-[#efeeea] text-ink-2"}`}>{tv(`quoteStatus.${q.status}` as never)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="rounded-[10px] border border-dashed border-[#d8d6cf] p-6 text-center text-[13px] text-muted">{t("empty")}</p>}
      </section>
    </div>
  );
}
