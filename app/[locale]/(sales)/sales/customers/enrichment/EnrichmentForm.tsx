"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CustomerProfileForm, type ProfileCustomer } from "@/components/customers/CustomerProfileForm";

export function EnrichmentForm({ customer, completed, total, areas, skip, single }: Readonly<{ customer: ProfileCustomer & { duplicate_review_required?: boolean | null }; completed: number; total: number; areas: Array<{ value: string; label: string }>; skip: number; single: boolean }>) {
  const t = useTranslations("customerImport");
  const tp = useTranslations("customerProfile");
  const router = useRouter();
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-4">
      {!single ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="font-semibold text-ink-2">{t("progressOf", { completed, total })}</span><span className="num font-semibold">{pct}%</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-track"><div className="rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
        </div>
      ) : null}
      <section className="flex flex-col gap-4 rounded-[10px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-[17px] font-bold">{customer.business_name}</h2>
            <span className="text-[13px] text-muted">{customer.area_code ?? "—"}</span>
          </div>
          {!single ? <Link href={`/sales/customers/enrichment?skip=${skip + 1}` as never} className="h-9 rounded-lg border border-line px-3 text-[13px] font-semibold leading-9 hover:bg-sunken">{tp("skip")}</Link> : null}
        </div>
        {customer.duplicate_review_required ? <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn"><b>{t("manualReview")}:</b> {t("duplicateReason")}</p> : null}
        <CustomerProfileForm
          key={customer.id}
          customer={customer}
          mode="enrich"
          areas={areas}
          submitLabel={single ? tp("save") : t("saveAndNext")}
          onSaved={({ dataComplete }) => { if (single) router.refresh(); else if (dataComplete) router.refresh(); else router.push(`/sales/customers/enrichment?skip=${skip + 1}` as never); }}
        />
      </section>
    </div>
  );
}
