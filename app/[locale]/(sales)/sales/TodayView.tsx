"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { markSalesFollowUpDone } from "./actions";
import { SalesAiRecommendations } from "./SalesAiRecommendations";

function displayPhone(phone: string | null | undefined) {
  return phone ? phone.replace(/^\+92(\d{3})(\d{3})(\d{4})$/, "0$1-$2$3") : "";
}

function whatsappHref(phone: string | null | undefined) {
  return phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : undefined;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TodayView({ locale, data }: { locale: string; data: Awaited<ReturnType<typeof import("@/lib/sales/queries").getSalesTodayData>> }) {
  const t = useTranslations("sales");
  const metrics = data.metrics as { calls_made: number; orders_placed: number; quotes_pending: number; revenue_booked: string };
  return (
    <div className="space-y-6">
      <PageHeader title={t("today")} description={t("todayDescription")} />
      <div className="flex flex-wrap gap-2">{[["/sales/route", t("route")], ["/sales/calendar", t("calendar")], ["/sales/performance", t("performance")], ["/sales/orders/new", t("placeForCustomer")]].map(([href, label]) => <Link key={href} href={href as never} className="inline-flex min-h-11 items-center rounded-md border border-primary px-3 text-sm font-semibold text-primary hover:bg-slate-50">{label}</Link>)}</div>
      <section aria-labelledby="today-numbers" className="space-y-3">
        <h2 id="today-numbers" className="text-lg font-semibold text-primary">{t("todayNumbers")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("callsMade")} value={<bdi>{metrics.calls_made}</bdi>} />
          <StatCard label={t("ordersPlaced")} value={<bdi>{metrics.orders_placed}</bdi>} />
          <StatCard label={t("quotesPending")} value={<bdi>{metrics.quotes_pending}</bdi>} />
          <StatCard label={t("revenueBooked")} value={<bdi>PKR {metrics.revenue_booked}</bdi>} />
        </div>
      </section>
      <section aria-labelledby="due-follow-ups" className="space-y-3">
        <h2 id="due-follow-ups" className="text-lg font-semibold text-primary">{t("dueToday")}</h2>
        {data.followUps.length === 0 ? (
          <EmptyState title={t("noFollowUps")} description={t("noFollowUpsHint")} />
        ) : (
          <div className="grid gap-3">
            {data.followUps.map((followUp) => {
              const contact = followUp.customer ?? followUp.lead;
              const primaryPhone = followUp.customer?.primary_phone ?? followUp.lead?.phone ?? null;
              const whatsappPhone = followUp.customer?.whatsapp_phone ?? null;
              return (
                <article key={followUp.id} className={`rounded-lg border bg-white p-4 shadow-sm ${followUp.isOverdue ? "border-[#D6202C]" : "border-slate-200"}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">{contact?.business_name ?? t("noCustomerData")}</p>
                      <p className="text-sm text-muted-foreground">{followUp.note}</p>
                      <p className={`mt-1 text-sm ${followUp.isOverdue ? "font-semibold text-[#D6202C]" : "text-muted-foreground"}`}>
                        {followUp.isOverdue ? `${t("overdue")} · ` : ""}<bdi>{formatDate(followUp.due_at, locale)}</bdi>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {primaryPhone ? <Button asChild size="sm"><a href={`tel:${primaryPhone}`}>{t("call")} <span className="sr-only">{displayPhone(primaryPhone)}</span></a></Button> : <Button size="sm" disabled title={t("errors.generic")}>{t("call")}</Button>}
                      {whatsappHref(whatsappPhone) ? <Button asChild size="sm" variant="outline"><a href={whatsappHref(whatsappPhone)} target="_blank" rel="noreferrer">{t("whatsapp")}</a></Button> : <Button size="sm" variant="outline" disabled title={t("errors.generic")}>{t("whatsapp")}</Button>}
                      <form action={markSalesFollowUpDone}>
                        <input type="hidden" name="followUpId" value={followUp.id} />
                        <Button type="submit" size="sm" variant="outline">{t("markDone")}</Button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section aria-labelledby="suggested-next" className="space-y-3">
        <h2 id="suggested-next" className="text-lg font-semibold text-primary">{t("suggestedNext")}</h2>
        <p className="text-sm text-muted-foreground">{t("suggestedNextHint")}</p>
        {data.suggested.length === 0 ? (
          <EmptyState title={t("noSuggested")} description={t("noSuggestedHint")} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.suggested.map((contact) => (
              <Link key={contact.customer_id} href={`/sales/customers/${contact.customer_id}` as never} className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-primary">
                <p className="font-semibold text-primary">{contact.business_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{contact.area_code}</p>
                <p className="mt-3 text-xs text-muted-foreground">{contact.last_contact_at ? formatDate(contact.last_contact_at, locale) : t("noCustomerData")}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SalesAiRecommendations />
    </div>
  );
}
