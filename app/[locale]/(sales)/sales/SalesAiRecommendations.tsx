"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-kit";

type Reason = { code: "contactGap" | "orderGap" | "followUps" | "quotes" | "review"; value: number };
type Recommendation = { customer_id: string; business_name: string; area_code: string; score: number; reasons: Reason[] };

export function SalesAiRecommendations() {
  const t = useTranslations("sales");
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const labels: Record<Reason["code"], string> = { contactGap: "aiReasonContactGap", orderGap: "aiReasonOrderGap", followUps: "aiReasonFollowUps", quotes: "aiReasonQuotes", review: "aiReasonReview" };

  async function load() {
    setWorking(true); setError("");
    try { const response = await fetch("/api/ai/sales/recommendations"); const body = await response.json() as { recommendations?: Recommendation[]; error?: string }; if (!response.ok) throw new Error(body.error || "error"); setRows(body.recommendations ?? []); setLoaded(true); }
    catch { setError(t("errors.generic")); }
    finally { setWorking(false); }
  }

  return <section className="space-y-3" aria-labelledby="ai-recommendations-heading">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="ai-recommendations-heading" className="text-lg font-semibold text-primary">{t("aiRecommendations")}</h2><p className="text-sm text-muted-foreground">{t("aiRecommendationsHint")}</p></div><Button type="button" variant="outline" onClick={() => void load()} disabled={working}>{working ? t("aiLoadingRecommendations") : t("aiLoadRecommendations")}</Button></div>
    {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
    {loaded && rows.length === 0 ? <EmptyState title={t("aiNoRecommendations")} description={t("aiNoRecommendationsHint")} /> : null}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.customer_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/sales/customers/${row.customer_id}` as never} className="font-semibold text-primary underline-offset-4 hover:underline">{row.business_name}</Link><p className="text-sm text-muted-foreground">{row.area_code}</p></div><span className="text-sm font-semibold text-primary"><bdi>{t("aiScore")}: {row.score}</bdi></span></div><p className="mt-3 text-sm font-medium text-primary">{t("aiWhy")}</p><ul className="mt-1 list-disc ps-5 text-sm text-slate-600">{row.reasons.map((reason) => <li key={reason.code}><bdi>{t(labels[reason.code], { value: reason.value })}</bdi></li>)}</ul></article>)}</div>
  </section>;
}
