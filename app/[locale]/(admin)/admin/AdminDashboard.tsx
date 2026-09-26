"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui-kit";
import { acknowledgeAdminAnomaly } from "./actions";

type Row = Record<string, string | number | null>;
type Analytics = Record<string, Row[]>;
type Alert = { id: string; title: string; body: string; status: string; created_at: string; supporting_metrics_json: unknown };

const BRAND = "#1f47c6";
const TINT = "#7c9ae8";
const INK = "#15171c";
const PIE = [BRAND, "#c2560c", "#0b6b3c", "#7c9ae8", "#5e6470", "#b42318", "#8a4b08", "#3a3f48"];
const axis = { fill: "#5e6470", fontSize: 12 };

function asRows(value: unknown): Row[] { return Array.isArray(value) ? value as Row[] : []; }
function ChartCard({ title, children, tall }: { title: string; children: React.ReactNode; tall?: boolean }) {
  return <section className="flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-5"><h3 className="text-[15px] font-semibold">{title}</h3><div className={tall ? "h-72" : "h-64"} dir="ltr">{children}</div></section>;
}
function EmptyChart({ text }: { text: string }) { return <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#d8d6cf] text-[13px] text-muted">{text}</div>; }

/** Detailed analytics under the overview: date range, charts, rankings, customer recency and alerts. */
export function AdminDashboard({ analytics, anomalies, rangeStart, rangeEnd, title, subtitle }: { analytics: unknown; anomalies: Alert[]; rangeStart: string; rangeEnd: string; title: string; subtitle: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const data = (analytics && typeof analytics === "object" ? analytics : {}) as Analytics;
  const empty = t("noDashboardData");

  function applyRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const startValue = String(form.get("rangeStart") ?? ""); const endValue = String(form.get("rangeEnd") ?? "");
    if (startValue) params.set("rangeStart", startValue);
    if (endValue) params.set("rangeEnd", endValue);
    start(() => router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}` as never, { scroll: false }));
  }
  async function reviewAlert(id: string) {
    const form = new FormData(); form.set("alertId", id); form.set("status", "ACKNOWLEDGED");
    try { await acknowledgeAdminAnomaly(form); setHidden((current) => new Set(current).add(id)); setMessage(t("saved")); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("error")); }
  }
  const bars = (key: string, labelKey: string, fill: string, width = 110) => asRows(data[key]).length ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={asRows(data[key])} layout="vertical" margin={{ left: 4, right: 12 }}>
        <CartesianGrid horizontal={false} stroke="#eeede8" />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={labelKey} width={width} tick={axis} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "#f1f0ec" }} contentStyle={{ borderRadius: 8, border: "1px solid #e4e3de", fontSize: 12.5 }} />
        <Bar dataKey="revenue_pkr" fill={fill} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  ) : <EmptyChart text={empty} />;
  const openAlerts = anomalies.filter((alert) => !hidden.has(alert.id));
  const has = (key: string) => asRows(data[key]).length > 0;
  const charts = [
    has("revenue_by_agent") && <ChartCard key="agent" title={t("revenueByAgent")}>{bars("revenue_by_agent", "agent", BRAND, 100)}</ChartCard>,
    has("revenue_by_category") && <ChartCard key="category" title={t("revenueByCategory")}>{bars("revenue_by_category", "category", TINT)}</ChartCard>,
    has("revenue_by_brand") && <ChartCard key="brand" title={t("revenueByBrand")}>{bars("revenue_by_brand", "brand", INK)}</ChartCard>,
    has("revenue_by_area") && <ChartCard key="area" title={t("revenueByArea")}>{bars("revenue_by_area", "area_code", BRAND, 80)}</ChartCard>,
    has("orders_by_customer_type") && (
      <ChartCard key="type" title={t("ordersByCustomerType")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={asRows(data.orders_by_customer_type)} dataKey="orders_count" nameKey="customer_type" innerRadius={55} outerRadius={95} paddingAngle={2} isAnimationActive={false} label>
              {asRows(data.orders_by_customer_type).map((row, index) => <Cell key={String(row.customer_type)} fill={PIE[index % PIE.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e3de", fontSize: 12.5 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    ),
    has("revenue_by_month") && rangeStart && (
      <ChartCard key="month" title={t("revenueByMonth")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={asRows(data.revenue_by_month)} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} stroke="#eeede8" />
            <XAxis dataKey="month" tick={axis} axisLine={{ stroke: "#e4e3de" }} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={70} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e3de", fontSize: 12.5 }} />
            <Line type="monotone" dataKey="revenue_pkr" stroke={BRAND} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    ),
  ].filter(Boolean);
  const ranks = [
    has("top_customers") && <RankCard key="c" title={t("topCustomers")} rows={asRows(data.top_customers)} labelKey="business_name" valueKey="revenue_pkr" valuePrefix="PKR " empty={empty} />,
    has("top_products") && <RankCard key="p" title={t("topProducts")} rows={asRows(data.top_products)} labelKey="name_en" valueKey="units_sold" valuePrefix="" empty={empty} />,
    has("lead_funnel") && <RankCard key="f" title={t("salesFunnel")} rows={asRows(data.lead_funnel)} labelKey="stage" valueKey="count" valuePrefix="" empty={empty} />,
    has("quote_conversion_by_agent") && <RankCard key="q" title={t("quoteConversion")} rows={asRows(data.quote_conversion_by_agent)} labelKey="agent" valueKey="converted" valuePrefix="" empty={empty} />,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="analytics-title">
      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="analytics-title" className="text-[19px] font-bold">{title}</h2>
          <p className="text-[13px] text-muted">{subtitle}</p>
        </div>
        <form onSubmit={applyRange} className="flex flex-wrap items-end gap-2" aria-busy={pending}>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">{t("from")}<input name="rangeStart" type="date" defaultValue={rangeStart} className="h-9 py-1" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">{t("to")}<input name="rangeEnd" type="date" defaultValue={rangeEnd} className="h-9 py-1" /></label>
          <button type="submit" className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50" disabled={pending}>{t("applyFilter")}</button>
        </form>
      </div>

      {openAlerts.length ? (
        <section className="flex flex-col gap-2 rounded-[10px] border border-[#f1c1bc] bg-surface p-5">
          <h3 className="text-[15px] font-semibold">{t("openAlerts")}</h3>
          {openAlerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 rounded-lg border border-line-soft bg-[#fcfcfb] p-3 md:flex-row md:items-center">
              <span className="inline-block size-2 shrink-0 rounded-full bg-bad" aria-hidden />
              <div className="flex-1"><p className="text-[13.5px] font-semibold">{alert.title}</p><p className="text-[12.5px] text-muted">{alert.body}</p></div>
              <button type="button" className="h-8 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-semibold hover:bg-sunken" onClick={() => void reviewAlert(alert.id)}>{t("acknowledge")}</button>
            </div>
          ))}
        </section>
      ) : null}

      {charts.length ? <div className="grid gap-4 xl:grid-cols-2">{charts}</div> : null}
      {ranks.length ? <div className="grid gap-4 lg:grid-cols-2">{ranks}</div> : null}
      {asRows(data.customer_map).length ? (
        <section className="flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-5">
          <h3 className="text-[15px] font-semibold">{t("customerMap")}</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {asRows(data.customer_map).map((row) => (
              <div key={`${row.area_code}-${row.business_name}`} className="flex items-start gap-2.5 rounded-lg border border-line-soft bg-[#fcfcfb] p-3">
                <span aria-hidden className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${row.recency_band === "RED" ? "bg-bad" : row.recency_band === "AMBER" ? "bg-orange" : "bg-good"}`} />
                <div className="min-w-0"><p className="truncate text-[13.5px] font-semibold">{String(row.business_name)}</p><p className="text-xs text-muted"><bdi>{String(row.area_code)}</bdi> · <bdi>{String(row.latitude)}, {String(row.longitude)}</bdi></p></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {!charts.length && !ranks.length && !asRows(data.customer_map).length ? <EmptyState compact title={empty} description={t("noDashboardDataHint")} /> : null}
      {message ? <p role="status" className="text-[13px] font-medium text-muted">{message}</p> : null}
    </section>
  );
}

function RankCard({ title, rows, labelKey, valueKey, valuePrefix, empty }: { title: string; rows: Row[]; labelKey: string; valueKey: string; valuePrefix: string; empty: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {rows.length ? (
        <ol className="flex max-h-64 flex-col overflow-auto">
          {rows.map((row, index) => (
            <li key={`${String(row[labelKey])}-${index}`} className="flex items-center gap-3 border-b border-line-soft py-2 text-[13.5px] last:border-0">
              <span className="num w-5 text-xs font-semibold text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{String(row[labelKey])}</span>
              <bdi className="num shrink-0 font-semibold">{valuePrefix}{String(row[valueKey])}</bdi>
            </li>
          ))}
        </ol>
      ) : <EmptyState compact title={empty} />}
    </section>
  );
}
