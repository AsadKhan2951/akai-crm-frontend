import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorCustomer, getVendorLedger } from "@/lib/vendor/queries";
import { formatKarachiDay, formatPkr } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";

export default async function VendorBalancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission("ledger.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "vendorBalance" });
  const tp = await getTranslations({ locale, namespace: "vendorPortal" });
  const tCart = await getTranslations({ locale, namespace: "vendorCart" });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) return <EmptyState title={tCart("notConfigured")} description={tCart("notConfiguredHint")} />;
  const [customer, entries] = await Promise.all([getVendorCustomer(customerId), getVendorLedger(customerId)]);
  const typeLabel = (type: string) => tp(`ledgerType.${type}` as never);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-muted-foreground">{t("outstanding")}</p>
          <p className="mt-2 text-3xl font-bold text-primary"><bdi>{formatPkr(customer?.current_balance_pkr)}</bdi></p>
          <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdate")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-muted-foreground">{tp("creditLimit")}</p>
          <p className="mt-2 text-3xl font-bold text-primary"><bdi>{formatPkr(customer?.credit_limit_pkr)}</bdi></p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">{t("ledger")}</h2>
        {entries.length === 0 ? <EmptyState title={t("noEntries")} description={t("noEntriesHint")} /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#F1F5F9] text-sm text-primary">
                <tr><th className="p-3 text-start">{t("date")}</th><th className="p-3 text-start">{t("reference")}</th><th className="p-3 text-start">{t("descriptionLabel")}</th><th className="p-3 text-end">{t("amount")}</th></tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="p-3"><bdi>{formatKarachiDay(entry.entry_date, locale)}</bdi></td>
                    <td className="p-3"><span className="block text-sm text-muted-foreground">{typeLabel(entry.type)}</span><bdi>{entry.reference_number}</bdi></td>
                    <td className="p-3">{entry.description}</td>
                    <td className="p-3 text-end font-semibold"><bdi>{formatPkr(entry.amount_pkr)}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
