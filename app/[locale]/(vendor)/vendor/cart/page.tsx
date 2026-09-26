import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorCart, getVendorCustomer, localName } from "@/lib/vendor/queries";
import { formatPkr, formatQuantity } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { acknowledgeVendorCartPrices, placeVendorOrder, requestVendorQuote, updateVendorCartLine } from "../actions";
import { CheckoutPaymentFields } from "./CheckoutPaymentFields";

export default async function VendorCartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  await requirePermission("order.create", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorCart" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tOrders = await getTranslations({ locale, namespace: "vendorOrders" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={t("notConfigured")} description={t("notConfiguredHint")} />;

  const sp = await searchParams;
  const skipped = Number.parseInt(String(Array.isArray(sp.skipped) ? sp.skipped[0] : sp.skipped ?? "0"), 10) || 0;
  const [{ cart, lines, totals, priceChanges, removedCount }, customer, canQuote] = await Promise.all([getVendorCart(customerId), getVendorCustomer(customerId), hasCurrentUserPermission("quote.create")]);
  const needsReview = Boolean(totals?.requires_price_review) || priceChanges.length > 0;
  const hasQuoteOnly = lines.some((line) => line.is_quote_only);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} actions={<Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-primary">{tp("continueShopping")}</Link>} />
      {removedCount > 0 ? <p role="status" className="rounded-md border border-[#b42318] bg-white p-3 text-sm text-[#b42318]">{t("removed", { count: removedCount })}</p> : null}
      {skipped > 0 ? <p role="status" className="rounded-md border border-slate-300 bg-white p-3 text-sm text-primary">{tOrders("reorderSkipped")}</p> : null}

      {!cart || lines.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyHint")} action={<Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{tp("browseCatalogue")}</Link>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section aria-label={t("lineItems")} className="space-y-3">
            {needsReview ? (
              <div className="space-y-3 rounded-lg border border-[#b42318] bg-white p-4">
                <h2 className="font-semibold text-[#b42318]">{tp("priceChangedTitle")}</h2>
                <p className="text-sm text-slate-700">{tp("priceChangedHint")}</p>
                {priceChanges.length ? (
                  <ul className="space-y-1 text-sm">
                    {priceChanges.map((change) => {
                      const line = lines.find((l) => l.product_id === change.product_id);
                      return <li key={change.id}>{line ? localName(line, locale) : ""}: <bdi className="line-through">{formatPkr(change.old_unit_price_pkr)}</bdi> → <bdi className="font-semibold">{formatPkr(change.new_unit_price_pkr)}</bdi></li>;
                    })}
                  </ul>
                ) : null}
                <form action={acknowledgeVendorCartPrices}><input type="hidden" name="cartId" value={cart.id} /><button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{tp("acceptPrices")}</button></form>
              </div>
            ) : null}
            {lines.map((line) => (
              <article key={line.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/vendor/catalogue/${line.product_id}` as never} className="font-semibold text-primary underline-offset-4 hover:underline">{localName(line, locale)}</Link>
                  <p className="text-sm text-muted-foreground"><bdi>{line.sku}</bdi></p>
                  <p className="text-sm text-slate-700">{line.is_quote_only ? t("noPrice") : <><bdi>{formatQuantity(line.quantity)}</bdi> × <bdi>{formatPkr(line.unit_price_pkr)}</bdi></>}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateVendorCartLine} className="flex items-center gap-2">
                    <input type="hidden" name="lineId" value={line.id} />
                    <label className="sr-only" htmlFor={`qty-${line.id}`}>{t("quantity")}</label>
                    <input id={`qty-${line.id}`} name="quantity" type="number" min={1} step="1" defaultValue={formatQuantity(line.quantity)} className="min-h-11 w-20 rounded-md border border-slate-300 px-2 text-center" />
                    <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-3 text-primary">{tp("updateQuantity")}</button>
                  </form>
                  <form action={updateVendorCartLine}>
                    <input type="hidden" name="lineId" value={line.id} />
                    <input type="hidden" name="quantity" value="0" />
                    <button type="submit" className="min-h-11 rounded-md px-3 text-[#b42318] underline-offset-4 hover:underline">{tp("removeLine")}</button>
                  </form>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-muted-foreground">{t("lineItems")}</dt><dd className="text-end font-semibold"><bdi>{totals?.line_count ?? lines.length}</bdi></dd>
                <dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="text-end text-lg font-bold text-primary"><bdi>{formatPkr(totals?.subtotal_pkr ?? "0")}</bdi></dd>
              </dl>
            </section>
            {hasQuoteOnly ? <p className="rounded-md border border-slate-300 bg-white p-3 text-sm text-primary">{tp("quoteOnlyInCart")}</p> : (
              <form action={placeVendorOrder} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-primary">{tp("checkoutTitle")}</h2>
                <input type="hidden" name="cartId" value={cart.id} />
                <input type="hidden" name="locale" value={locale} />
                <CheckoutPaymentFields
                  labels={{ paymentMethod: t("paymentMethod"), balance: t("balancePayment"), credit: t("creditPayment"), creditNotice: t("creditNotice") }}
                  balanceText={formatPkr(customer?.current_balance_pkr)}
                  creditLimitText={formatPkr(customer?.credit_limit_pkr)}
                  creditLimitLabel={tp("creditLimit")}
                  balanceLabel={tp("currentBalance")}
                />
                <label className="block text-sm font-medium text-primary">{t("redeemPoints")}
                  <input name="points" type="number" min={0} max={customer?.loyalty_points_balance ?? 0} step="1" defaultValue={0} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" />
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">{tp("pointsAvailable", { points: customer?.loyalty_points_balance ?? 0 })}</span>
                </label>
                <label className="block text-sm font-medium text-primary">{t("deliveryNotes")}
                  <textarea name="notes" maxLength={500} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                {needsReview ? <p className="text-sm font-semibold text-[#b42318]">{t("reviewChanges")}</p> : null}
                <button type="submit" disabled={needsReview} className="min-h-12 w-full rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 text-lg font-semibold text-white disabled:opacity-50">{t("placeOrder")}</button>
              </form>
            )}
            {canQuote ? (
              <form action={requestVendorQuote} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
                <input type="hidden" name="cartId" value={cart.id} />
                <input type="hidden" name="locale" value={locale} />
                <p className="text-sm text-slate-700">{tp("quoteHint")}</p>
                <textarea name="notes" maxLength={500} placeholder={tp("quoteNotesPlaceholder")} className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2" />
                <button type="submit" className="min-h-11 w-full rounded-md border border-primary px-4 font-semibold text-primary">{t("requestQuote")}</button>
              </form>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
