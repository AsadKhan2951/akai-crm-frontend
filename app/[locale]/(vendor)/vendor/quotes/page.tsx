import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorQuotes } from "@/lib/vendor/queries";
import { formatKarachiDay, formatPkr } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { StatusBadge } from "@/components/vendor/StatusBadge";

export default async function VendorQuotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission("quote.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorQuotes" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tCart = await getTranslations({ locale, namespace: "vendorCart" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={tCart("notConfigured")} description={tCart("notConfiguredHint")} />;
  const quotes = await getVendorQuotes(customerId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {quotes.length === 0 ? (
        <EmptyState title={t("noQuotes")} description={t("noQuotesHint")} action={<Link href="/vendor/catalogue" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{tp("browseCatalogue")}</Link>} />
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/vendor/quotes/${quote.id}` as never} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-primary"><bdi>{quote.quote_number}</bdi></p>
                  <p className="text-sm text-muted-foreground"><bdi>{formatKarachiDay(quote.created_at, locale)}</bdi>{quote.valid_until ? <> · {t("validUntil")}: <bdi>{formatKarachiDay(quote.valid_until, locale)}</bdi></> : null}</p>
                </div>
                <div className="flex items-center gap-3">
                  {quote.status === "QUOTED" || quote.status === "ACCEPTED" || quote.status === "CONVERTED" ? <bdi className="font-semibold text-primary">{formatPkr(quote.total_pkr)}</bdi> : null}
                  <StatusBadge kind="quote" status={quote.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
