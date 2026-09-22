"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { markBeatVisitAction, rescheduleBeatVisitAction } from "./actions";
import type { SalesBeatData, BeatVisitRow } from "@/lib/beat/queries";

const dispositions = ["CONNECTED", "NO_ANSWER", "ORDER_PLACED", "PAYMENT_COLLECTED", "FOLLOW_UP_SCHEDULED", "COMPLAINT"] as const;

export function SalesBeatView({ data }: { data: SalesBeatData }) {
  const t = useTranslations("beat");
  const locale = useLocale();
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: string; longitude: string; accuracy: string } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [briefing, setBriefing] = useState("");
  const [briefingSource, setBriefingSource] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  function captureLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) { setLocationMessage(t("locationNotAvailable")); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude), accuracy: String(position.coords.accuracy) });
      setLocationMessage(t("locationCaptured"));
    }, () => setLocationMessage(t("locationNotAvailable")), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  async function prepareBriefing() {
    setBriefingLoading(true);
    setBriefing("");
    try {
      const response = await fetch("/api/ai/beat-briefing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plannedDate: data.plannedDate, locale }) });
      const body = await response.json() as { draft?: string; source?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? t("aiUnavailable"));
      setBriefing(body.draft ?? t("aiUnavailable"));
      setBriefingSource(body.source ?? "fallback");
    } catch (error) {
      setBriefing(error instanceof Error ? error.message : t("aiUnavailable"));
      setBriefingSource("fallback");
    } finally { setBriefingLoading(false); }
  }

  const visits = data.visits as BeatVisitRow[];
  return (
    <div className="space-y-6">
      <PageHeader title={t("visitToday")} description={t("visitTodayDescription")} />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">{t("progress")}</p><p className="mt-1 text-xl font-bold text-primary"><bdi>{data.summary.completed}</bdi> / <bdi>{data.summary.planned}</bdi></p><p className="text-sm text-muted-foreground">{t("stopsCompleted", { completed: String(data.summary.completed), planned: String(data.summary.planned) })}</p></div><div className="text-end"><p className="text-sm text-muted-foreground">{t("productive")}</p><p className="text-xl font-bold text-primary"><bdi>{data.summary.productive}</bdi></p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(data.summary.progress_percent ?? 0))}%` }} /></div></section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-primary">{t("briefing")}</h2><p className="text-sm text-muted-foreground">{t("briefingHint")}</p></div><Button type="button" onClick={() => void prepareBriefing()} disabled={briefingLoading}>{briefingLoading ? t("briefingReady") : t("generateBriefing")}</Button></div>{briefing ? <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm text-primary">{briefing}</p><p className="mt-3 text-sm text-muted-foreground">{t("draftOnly")} · {t("source")}: <bdi>{briefingSource}</bdi></p></div> : null}</section>

      {visits.length === 0 ? <EmptyState title={t("noTodayStops")} description={t("noTodayStopsHint")} /> : <section className="space-y-3">{visits.map((visit) => <BeatStopCard key={visit.visit_id} visit={visit} active={activeVisit === visit.visit_id} onOpen={() => { setActiveVisit(activeVisit === visit.visit_id ? null : visit.visit_id); setLocation(null); setLocationMessage(""); }} t={t} locale={locale} location={location} locationMessage={locationMessage} captureLocation={captureLocation} />)}</section>}
    </div>
  );
}

function BeatStopCard({ visit, active, onOpen, t, locale, location, locationMessage, captureLocation }: { visit: BeatVisitRow; active: boolean; onOpen: () => void; t: ReturnType<typeof useTranslations>; locale: string; location: { latitude: string; longitude: string; accuracy: string } | null; locationMessage: string; captureLocation: () => void }) {
  const [skipOpen, setSkipOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const navigateHref = visit.latitude && visit.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${visit.latitude},${visit.longitude}`)}` : null;
  const statusLabel = visit.visit_status === "VISITED" ? t("visited") : visit.visit_status === "SKIPPED" ? t("skipped") : visit.visit_status === "RESCHEDULED" ? t("rescheduled") : t("plannedStatus");
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"><bdi>{visit.sequence}</bdi></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-semibold text-primary">{visit.business_name}</h2><p className="text-sm text-muted-foreground">{visit.area_code} · <bdi>{statusLabel}</bdi></p></div>{navigateHref ? <a href={navigateHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-primary px-3 text-sm font-semibold text-primary">{t("navigate")}</a> : null}</div><div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><p>{t("address")}: {visit.full_address || "—"}</p><p>{t("outstandingBalance")}: <bdi>{visit.outstanding_balance_pkr}</bdi> PKR</p><p>{t("lastVisit")}: <bdi>{visit.last_visit_at ? new Date(visit.last_visit_at).toLocaleDateString(locale === "ur" ? "ur-PK" : "en-PK") : "—"}</bdi></p><p>{t("lastOrder")}: <bdi>{visit.last_order_at ? new Date(visit.last_order_at).toLocaleDateString(locale === "ur" ? "ur-PK" : "en-PK") : "—"}</bdi></p><p>{t("openFollowUps")}: <bdi>{visit.open_followups}</bdi></p></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/sales/customers/${visit.customer_id}` as never} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-primary">{t("openCustomer")}</Link>{visit.visit_status === "PLANNED" || visit.visit_status === "RESCHEDULED" ? <Button type="button" onClick={onOpen}>{active ? t("saveVisit") : t("markVisited")}</Button> : null}{visit.visit_status === "PLANNED" || visit.visit_status === "RESCHEDULED" ? <Button type="button" variant="outline" onClick={() => setSkipOpen(!skipOpen)}>{t("skipVisit")}</Button> : null}{visit.visit_status === "PLANNED" || visit.visit_status === "RESCHEDULED" ? <Button type="button" variant="outline" onClick={() => setRescheduleOpen(!rescheduleOpen)}>{t("reschedule")}</Button> : null}</div></div></div>
    {active && visit.visit_status !== "VISITED" && visit.visit_status !== "SKIPPED" ? <form action={markBeatVisitAction} className="mt-4 space-y-4 rounded-md bg-slate-50 p-4"><input type="hidden" name="visitId" value={visit.visit_id} /><input type="hidden" name="status" value="VISITED" /><input type="hidden" name="latitude" value={location?.latitude ?? ""} /><input type="hidden" name="longitude" value={location?.longitude ?? ""} /><input type="hidden" name="accuracyMeters" value={location?.accuracy ?? ""} /><label className="block text-sm font-medium text-primary">{t("disposition")}<select name="disposition" defaultValue="CONNECTED" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">{dispositions.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label className="block text-sm font-medium text-primary">{t("visitNotes")}<textarea name="notes" rows={3} placeholder={t("visitNotesPlaceholder")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={captureLocation}>{t("captureLocation")}</Button><span className="text-sm text-muted-foreground">{locationMessage || t("locationNotAvailable")}</span></div><Button type="submit">{t("saveVisit")}</Button></form> : null}
    {skipOpen ? <form action={markBeatVisitAction} className="mt-4 space-y-3 rounded-md bg-slate-50 p-4"><input type="hidden" name="visitId" value={visit.visit_id} /><input type="hidden" name="status" value="SKIPPED" /><label className="block text-sm font-medium text-primary">{t("skipReason")}<textarea name="skipReason" required minLength={2} placeholder={t("skipReasonPlaceholder")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><Button type="submit" variant="outline">{t("skipVisit")}</Button></form> : null}
    {rescheduleOpen ? <form action={rescheduleBeatVisitAction} className="mt-4 space-y-3 rounded-md bg-slate-50 p-4"><input type="hidden" name="visitId" value={visit.visit_id} /><label className="block text-sm font-medium text-primary">{t("rescheduleDate")}<input type="date" name="newDate" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="block text-sm font-medium text-primary">{t("rescheduleReason")}<textarea name="reason" required minLength={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><Button type="submit" variant="outline">{t("rescheduleVisit")}</Button></form> : null}
  </article>;
}
