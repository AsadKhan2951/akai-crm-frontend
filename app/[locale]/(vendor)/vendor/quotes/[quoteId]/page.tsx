import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorQuote, localName } from "@/lib/vendor/queries";
import { formatKarachiDateTime, formatKarachiDay, formatPkr, formatQuantity } from "@/lib/format/money";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { StatusBadge } from "@/components/vendor/StatusBadge";
import { acceptVendorQuote, declineVendorQuote } from "../../actions";

export default async function VendorQuotePage({ params }: { params: Promise<{ locale: string; quoteId: string }> }) {
  const { locale, quoteId } = await params;
  await requirePermission("quote.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorQuotes" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tCart = await getTranslations({ locale, namespace: "vendorCart" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={tCart("notConfigured")} description={tCart("notConfiguredHint")} />;
  const back = <Link href="/vendor/quotes" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("title")}</Link>;
  const result = /^[0-9a-f-]{36}$/i.test(quoteId) ? await getVendorQuote(customerId, quoteId) : null;
  if (!result) return <div className="space-y-4">{back}<EmptyState title={tp("quoteNotFound")} description={tp("quoteNotFoundHint")} /></div>;
  const { quote, lines } = result;
  const [canOrder, canQuote] = await Promise.all([hasCurrentUserPermission("order.create"), hasCurrentUserPermission("quote.create")]);
  const expired = quote.valid_until ? new Date(quote.valid_until).getTime() < Date.now() : false;
  const actionable = quote.status === "QUOTED" && !expired;

  return (
    <div className="space-y-6">
      {back}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary"><bdi>{quote.quote_number}</bdi></h1>
          <p className="text-sm text-muted-foreground"><bdi>{formatKarachiDateTime(quote.created_at, locale)}</bdi>{quote.valid_until ? <> · {t("validUntil")}: <bdi>{formatKarachiDay(quote.valid_until, locale)}</bdi></> : null}</p>
        </div>
        <StatusBadge kind="quote" status={quote.status === "QUOTED" && expired ? "EXPIRED" : quote.status} />
      </header>
      {quote.status === "REQUESTED" || quote.status === "IN_REVIEW" ? <p className="rounded-md border border-slate-300 bg-white p-3 text-sm text-primary">{t("agentInformed")}</p> : null}
      {quote.customer_notes ? <p className="text-sm text-slate-700">{tp("yourNotes")}: {quote.customer_notes}</p> : null}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[560px]">
          <thead className="bg-[#f1f0ec] text-sm text-primary">
            <tr><th className="p-3 text-start">{t("product")}</th><th className="p-3 text-start">{t("requestedQuantity")}</th><th className="p-3 text-start">{t("quotedPrice")}</th><th className="p-3 text-start">{tp("lineTotal")}</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="p-3"><span className="font-medium text-primary">{localName(line.product, locale)}</span><br /><bdi className="text-sm text-muted-foreground">{line.product?.sku}</bdi>{line.requested_notes ? <p className="text-sm text-slate-600">{line.requested_notes}</p> : null}</td>
                <td className="p-3"><bdi>{formatQuantity(line.quantity)}</bdi></td>
                <td className="p-3">{line.quoted_unit_price_pkr ? <bdi>{formatPkr(line.quoted_unit_price_pkr)}</bdi> : <span className="text-muted-foreground">{tp("waitingForPrice")}</span>}</td>
                <td className="p-3 font-semibold">{line.line_total_pkr ? <bdi>{formatPkr(line.line_total_pkr)}</bdi> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {quote.status !== "REQUESTED" && quote.status !== "IN_REVIEW" ? <p className="text-end text-lg font-bold text-primary">{tp("total")}: <bdi>{formatPkr(quote.total_pkr)}</bdi></p> : null}
      {quote.converted_order_id ? <Link href={`/vendor/orders/${quote.converted_order_id}` as never} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{tp("viewOrder")}</Link> : null}

      {actionable ? (
        <section className="grid gap-4 md:grid-cols-2">
          {canOrder ? (
            <form action={acceptVendorQuote} className="rounded-lg border border-slate-200 bg-white p-4">
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="min-h-12 w-full rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 text-lg font-semibold text-white">{t("acceptOrder")}</button>
            </form>
          ) : null}
          {canQuote ? (
            <form action={declineVendorQuote} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <input type="hidden" name="quoteId" value={quote.id} />
              <label className="block text-sm font-medium text-primary">{t("declineReason")}<input name="reason" maxLength={300} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
              <button type="submit" className="min-h-11 w-full rounded-md border border-slate-300 px-4 text-primary">{t("saveDecline")}</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
