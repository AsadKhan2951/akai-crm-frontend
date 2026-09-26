"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/ui-kit";

type Performance = { summary: { orders_count: number; revenue_pkr: string; quoted_count: number; converted_quotes_count: number; quote_conversion_rate: string; monthly_target_pkr: string; target_progress_percent: string }; dailyRevenue: Array<{ day: string; revenue_pkr: string }> };

export function PerformanceView({ data }: { data: Performance }) {
  const t = useTranslations("sales");
  const summary = data.summary;
  return <div className="space-y-6"><PageHeader title={t("performanceTitle")} description={t("performanceDescription")} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t("ordersPlaced")} value={<bdi>{summary.orders_count}</bdi>} /><StatCard label={t("revenueBooked")} value={<bdi>PKR {summary.revenue_pkr}</bdi>} /><StatCard label={t("quoteConversion")} value={<bdi>{summary.quote_conversion_rate}%</bdi>} /><StatCard label={t("targetProgress")} value={<bdi>{summary.target_progress_percent}%</bdi>} hint={`${t("monthlyTarget")}: PKR ${summary.monthly_target_pkr}`} /></div><section className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="mb-4 font-semibold text-primary">{t("dailyRevenue")}</h2>{data.dailyRevenue.length ? <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.dailyRevenue} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" /><XAxis dataKey="day" tick={{ fill: "#5e6470", fontSize: 12 }} /><YAxis tick={{ fill: "#5e6470", fontSize: 12 }} tickFormatter={(value) => String(value)} /><Tooltip formatter={(value) => [`PKR ${String(value)}`, t("revenueBooked")]} /><Bar dataKey="revenue_pkr" fill="#15171c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="rounded-md bg-slate-50 p-6 text-center text-sm text-muted-foreground">{t("noRevenue")} {t("noRevenueHint")}</p>}</section></div>;
}
