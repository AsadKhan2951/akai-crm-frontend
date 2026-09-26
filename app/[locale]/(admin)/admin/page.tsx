import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { KpiCard } from "@/components/admin/ui/KpiCard";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { RevenueByMonthChart } from "@/components/admin/charts/RevenueByMonthChart";
import { HBarList } from "@/components/admin/charts/HBarList";
import { AgeingBar } from "@/components/admin/charts/AgeingBar";
import { NeedsAttention, type AttentionItem } from "@/components/admin/overview/NeedsAttention";
import { AgentTable } from "@/components/admin/overview/AgentTable";
import { DataHealthCard, type HealthRow } from "@/components/admin/overview/DataHealthCard";
import { MobileGlance } from "@/components/admin/mobile/MobileGlance";
import { OverviewAsk } from "./OverviewAsk";
import { AnalyticsSection } from "./AnalyticsSection";
import { getCurrentAdmin, getOpsSummary } from "@/lib/admin/ops";
import { isPhoneRequest } from "@/lib/admin/device";
import { setGlanceView } from "@/lib/admin/actions";
import { change, longDate, pct, pkr, type AppLocale } from "@/lib/admin/format";
import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";

export default async function AdminHomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ rangeStart?: string; rangeEnd?: string }> }) {
  await requirePermission("dashboard.view", { asNotFound: true });
  const { locale: l } = await params;
  const locale = (l === "ur" ? "ur" : "en") as AppLocale;
  const sp = await searchParams;
  const t = await getTranslations("console");
  const [s, phone, me] = await Promise.all([getOpsSummary(), isPhoneRequest(), getCurrentAdmin()]);

  // Phones get the read-only glance first; "Open full console" switches to this page.
  if (phone) {
    return <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas"><MobileGlance s={s} userName={me?.name ?? ""} /></div>;
  }
  const onPhoneDesktop = (await cookies()).get("admin_view")?.value === "desktop";

  const P = (v: number) => pkr(v, locale, { compact: true });
  const revChange = s.can.revenue ? change(s.revenueMtd, s.revenuePrevMonth) : null;
  const ordChange = s.ordersMtd - s.ordersPrevMonth;
  const collPct = s.collectionTarget ? pct(s.collectedMtd, s.collectionTarget) : null;
  const h = s.dataHealth;

  const attention: AttentionItem[] = [];
  if (s.pendingApprovals.count) attention.push({ key: "ap", tone: "warn", href: "/admin/approvals", action: t("overview.attn.review"),
    title: t("overview.attn.approvals", { n: s.pendingApprovals.count }), meta: t("overview.attn.approvalsMeta", { amount: pkr(s.pendingApprovals.amount, locale), n: s.pendingApprovals.overLimit }) });
  if (s.bouncedCheques.count) attention.push({ key: "bc", tone: "bad", href: "/admin/recovery", action: t("overview.attn.followUp"),
    title: t("overview.attn.bounced", { n: s.bouncedCheques.count }), meta: pkr(s.bouncedCheques.amount, locale) });
  if (s.overdue60.count) attention.push({ key: "od", tone: "bad", href: "/admin/recovery", action: t("overview.attn.seeList"),
    title: t("overview.attn.overdue60", { n: s.overdue60.count }), meta: P(s.overdue60.amount) });
  if (s.delivery.delayedRuns) attention.push({ key: "dl", tone: "warn", href: "/admin/delivery", action: t("overview.attn.open"),
    title: t("overview.attn.delayed", { n: s.delivery.delayedRuns }), meta: t("overview.attn.delayedMeta") });

  const health: HealthRow[] = [
    { key: "profiles", severity: h.completeProfiles < h.dealerCount ? "bad" : "ok", href: "/admin/customers?view=incomplete",
      label: t("overview.health.profiles"), value: t("common.xOfY", { x: h.completeProfiles, y: h.dealerCount }), meta: t("overview.health.profilesMeta"), action: t("overview.health.profilesAction") },
    { key: "agents", severity: h.withAgent < h.dealerCount ? "bad" : "ok", href: "/admin/customers?view=unassigned",
      label: t("overview.health.agents"), value: t("common.xOfY", { x: h.withAgent, y: h.dealerCount }), meta: t("overview.health.agentsMeta"), action: t("overview.health.agentsAction") },
    { key: "areas", severity: h.noArea > 0 ? "warn" : "ok", href: "/admin/customers",
      label: t("overview.health.areas"), value: String(h.noArea), meta: t("overview.health.areasMeta"), action: t("overview.health.areasAction") },
    { key: "types", severity: h.typeOther > 0 ? "warn" : "ok", href: "/admin/customers?type=OTHER",
      label: t("overview.health.types"), value: t("common.xOfY", { x: h.typeOther, y: h.dealerCount }), meta: t("overview.health.typesMeta", { n: h.typeSuggestions }), action: t("overview.health.typesAction") },
    { key: "dupes", severity: h.duplicatesFlagged > 0 ? "warn" : "ok", href: "/admin/customers?view=duplicates",
      label: t("overview.health.dupes"), value: String(h.duplicatesFlagged), meta: t("overview.health.dupesMeta"), action: t("overview.health.dupesAction") },
  ];
  const ageLabels = { "0_30": t("glance.ageing.0_30"), "31_60": t("glance.ageing.31_60"), "61_90": t("glance.ageing.61_90"), "90_plus": t("glance.ageing.90_plus") };

  return (
    <>
      <PageHeader title={t("overview.title")} subtitle={t("overview.subtitle", { date: longDate(new Date(), locale) })}
        actions={onPhoneDesktop ? <form action={setGlanceView}><button type="submit" className="text-[13px] font-semibold text-brand underline">{t("overview.glanceView")}</button></form> : undefined} />
      <div className="flex flex-col gap-5">
        <OverviewAsk rangeStart={sp.rangeStart ?? ""} rangeEnd={sp.rangeEnd ?? ""} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label={t("kpi.revenue")} value={s.can.revenue ? P(s.revenueMtd) : "—"} tone={revChange == null ? "neutral" : revChange >= 0 ? "good" : "bad"}
            note={revChange == null ? undefined : t("kpi.vsLastMonth", { p: `${revChange >= 0 ? "+" : ""}${revChange}` })} />
          <KpiCard label={t("kpi.orders")} value={String(s.ordersMtd)} tone={ordChange >= 0 ? "good" : "bad"} note={t("kpi.ordersVsLast", { n: `${ordChange >= 0 ? "+" : ""}${ordChange}` })} />
          <KpiCard label={t("kpi.approvals")} value={String(s.pendingApprovals.count)} href="/admin/approvals"
            tone={s.pendingApprovals.overLimit ? "warn" : "neutral"} note={s.pendingApprovals.overLimit ? t("kpi.overLimit", { n: s.pendingApprovals.overLimit }) : undefined} />
          <KpiCard label={t("kpi.activeDealers")} value={String(s.activeCustomers)} note={t("kpi.ofDealers", { n: h.dealerCount })} />
          <KpiCard label={t("kpi.receivables")} value={s.can.ledger ? P(s.receivables) : "—"} tone={s.overdue30.amount ? "bad" : "neutral"}
            note={s.overdue30.amount ? t("kpi.overdue30", { amount: P(s.overdue30.amount) }) : undefined} />
          <KpiCard label={t("kpi.collected")} value={s.can.collections ? P(s.collectedMtd) : "—"} tone={collPct != null && collPct < 70 ? "warn" : "neutral"}
            note={s.collectionTarget ? t("kpi.ofTarget", { p: collPct ?? 0, target: P(s.collectionTarget) }) : undefined} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={t("overview.revenueByMonth")} meta={t("overview.last6Months")} />
            <div className="px-5 pb-4">
              {s.revenueByMonth.some((m) => m.value > 0) ? <RevenueByMonthChart data={s.revenueByMonth} /> : <EmptyState compact title={t("overview.noRevenue")} body={t("overview.noRevenueBody")} />}
            </div>
          </Card>
          <NeedsAttention title={t("overview.needsAttention")} items={attention} emptyTitle={t("overview.allClear")} emptyBody={t("overview.allClearBody")} />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={t("overview.agents")} action={<Link href="/admin/team" className="text-[13px] font-semibold text-brand">{t("common.viewAll")}</Link>} />
            {s.agents.length ? (
              <AgentTable agents={s.agents} locale={locale} labels={{
                agent: t("overview.cols.agent"), revenue: t("overview.cols.revenue"), orders: t("overview.cols.orders"),
                visits: t("overview.cols.visits"), recovery: t("overview.cols.recovery"), of: (a, b) => t("common.xOfY", { x: a, y: b }),
              }} />
            ) : <div className="px-5 pb-5"><EmptyState compact title={t("overview.noAgents")} body={t("overview.noAgentsBody")} /></div>}
            {s.revenueByCategory.length > 0 && (
              <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
                <h3 className="text-[13.5px] font-semibold">{t("overview.byCategory")}</h3>
                <HBarList rows={s.revenueByCategory.slice(0, 6).map((c) => ({ label: locale === "ur" && c.nameUr ? c.nameUr : c.name, value: c.value }))} format={P} />
              </div>
            )}
          </Card>
          <div className="flex flex-col gap-4">
            {s.can.ledger && s.ageing.length > 0 && (
              <Card>
                <CardHeader title={t("glance.outstanding")} meta={P(s.receivables)} />
                <div className="px-5 pb-5"><AgeingBar size="sm" buckets={s.ageing} locale={locale} labels={ageLabels} customersLabel={() => ""} /></div>
              </Card>
            )}
            <DataHealthCard title={t("overview.health.title")} subtitle={t("overview.health.subtitle")} rows={health} />
          </div>
        </div>

        <Suspense fallback={<div className="h-40 animate-pulse rounded-[10px] bg-[#ebeae5]" />}>
          <AnalyticsSection rangeStart={sp.rangeStart ?? ""} rangeEnd={sp.rangeEnd ?? ""} title={t("overview.moreAnalytics")} subtitle={t("overview.moreAnalyticsBody")} />
        </Suspense>
      </div>
    </>
  );
}
