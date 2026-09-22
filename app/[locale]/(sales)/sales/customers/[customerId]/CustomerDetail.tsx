"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { draftSalesCustomerBrief, draftSalesFollowUp } from "../../actions";
import { manualCallProvider } from "@/lib/messaging/calls";
import type { VisibleScheme } from "@/lib/schemes/queries";
import { VoicePlayback } from "@/components/VoicePlayback";

type DetailData = {
  customer: Record<string, string | boolean | null> | null;
  orders: Array<Record<string, string | null>>;
  quotes: Array<Record<string, string | null>>;
  activities: Array<Record<string, string | null>>;
  ledger: Array<Record<string, string | null>>;
  followUps: Array<Record<string, string | boolean | null>>;
  voiceNotes: Array<{ id: string; processing_status: string; transcript: string | null; created_at: string; duration_seconds: number }>;
};
type Tab = "overview" | "orders" | "quotes" | "activity" | "ledger" | "followUps";

function date(value: string | null, locale: string) {
  return value ? new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export function CustomerDetail({ locale, data, canAi, schemes }: { locale: string; data: DetailData; canAi: boolean; schemes: VisibleScheme[] }) {
  const t = useTranslations("sales");
  const schemeT = useTranslations("scheme");
  const customer = data.customer;
  const [tab, setTab] = useState<Tab>("overview");
  const [brief, setBrief] = useState<string[]>([]);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  if (!customer) return <EmptyState title={t("noCustomers")} description={t("noCustomersHint")} />;
  const tabs: Tab[] = ["overview", "orders", "quotes", "activity", "ledger", "followUps"];
  const translate = (key: string) => t(key as never);
  const customerId = String(customer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(customer.business_name)}
        description={`${String(customer.area_code)} · ${t(`types.${String(customer.customer_type)}` as never)}`}
        actions={
          <>
            <Link href="/sales/activity" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white">{t("logActivity")}</Link>
            {customer.primary_phone ? <a href={manualCallProvider.createTelLink(String(customer.primary_phone))} onClick={() => manualCallProvider.rememberCall({ customerId, phone: String(customer.primary_phone), label: String(customer.business_name), startedAt: Date.now() })} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-primary">{t("call")}</a> : null}
            {canAi ? (
              <>
                <Button type="button" variant="outline" disabled={isPending} onClick={() => startTransition(() => { void draftSalesCustomerBrief(customerId, locale).then((result) => setBrief(result.lines)); })}>{t("briefMe")}</Button>
                <Button type="button" variant="outline" disabled={isPending} onClick={() => startTransition(() => { void draftSalesFollowUp(customerId, locale).then((result) => setFollowUpDraft(result.draft)); })}>{t("draftFollowUp")}</Button>
              </>
            ) : null}
          </>
        }
      />
      {brief.length ? <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h2 className="font-semibold text-primary">{t("briefDraft")}</h2><ol className="mt-2 list-decimal ps-5 text-sm text-primary">{brief.map((line) => <li key={line}>{line}</li>)}</ol><p className="mt-3 text-xs text-muted-foreground">{t("draftOnlyHint")}</p></section> : null}
      {followUpDraft ? <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h2 className="font-semibold text-primary">{t("draftFollowUp")}</h2><textarea value={followUpDraft} onChange={(event) => setFollowUpDraft(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3" /><p className="mt-2 text-xs text-muted-foreground">{t("draftOnlyHint")}</p></section> : null}
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-primary">{schemeT("title")}</h2>{schemes.length ? <div className="grid gap-3 md:grid-cols-2">{schemes.map((scheme) => <article key={scheme.id} className="rounded-md bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{scheme.name_en}</h3><p className="font-urdu" dir="rtl">{scheme.name_ur}</p></div>{new Date(scheme.ends_at).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000 ? <span className="text-sm font-semibold text-primary">{schemeT("expiringSoon")}</span> : null}</div><p className="mt-2 text-sm">{scheme.description_en}</p><p className="mt-2 text-sm text-muted-foreground">{scheme.terms_en}</p><p className="mt-2 text-xs text-muted-foreground"><bdi>{new Date(scheme.ends_at).toLocaleDateString("en-PK")}</bdi></p></article>)}</div> : <p className="text-sm text-muted-foreground">{schemeT("noResultsHint")}</p>}</section>
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{tabs.map((item) => <Button key={item} type="button" variant={tab === item ? "default" : "ghost"} onClick={() => setTab(item)}>{t(item)}</Button>)}</div>
      {tab === "overview" ? <div className="grid gap-4 md:grid-cols-2"><Info label={t("contactName")} value={String(customer.contact_person_name ?? "—")} /><Info label={t("phone")} value={String(customer.primary_phone ?? "—")} numeric /><Info label={t("whatsapp")} value={String(customer.whatsapp_phone ?? "—")} numeric /><Info label={t("email")} value={String(customer.email ?? "—")} /><Info label={t("fullAddress")} value={String(customer.full_address ?? "—")} /><Info label={t("revenueBooked")} value={`PKR ${String(customer.current_balance_pkr ?? "0.00")}`} numeric /></div> : tab === "activity" ? <div className="space-y-6"><DetailList tab={tab} data={data} locale={locale} t={translate} /><VoicePlayback notes={data.voiceNotes} /></div> : <DetailList tab={tab} data={data} locale={locale} t={translate} />}
    </div>
  );
}

function Info({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={numeric ? "mt-1 text-primary [unicode-bidi:isolate]" : "mt-1 text-primary"}><bdi>{value}</bdi></p></div>;
}

function DetailList({ tab, data, locale, t }: { tab: Exclude<Tab, "overview">; data: DetailData; locale: string; t: (key: string) => string }) {
  const rows: Array<Record<string, string | boolean | null>> = tab === "activity" ? data.activities : data[tab];
  if (!rows.length) return <EmptyState title={t("noCustomerData")} description={t("noCustomerDataHint")} />;
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">{tab === "activity" ? t("activityType") : t("stage")}</th><th className="p-3">{t("notes")}</th><th className="p-3">{t("date")}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-t border-slate-100"><td className="p-3 font-medium text-primary">{String(row.type ?? row.status ?? row.order_number ?? row.quote_number ?? row.priority ?? "—")}</td><td className="p-3">{String(row.notes ?? row.description ?? row.note ?? row.total_pkr ?? row.amount_pkr ?? "—")}</td><td className="p-3"><bdi>{date(String(row.occurred_at ?? row.placed_at ?? row.created_at ?? row.entry_date ?? row.due_at ?? ""), locale)}</bdi></td></tr>)}</tbody></table></div>;
}
