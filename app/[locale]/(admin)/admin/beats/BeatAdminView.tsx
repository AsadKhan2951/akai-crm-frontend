"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { createBeatAction, createBeatFrequencyTargetAction, planBeatAction, toggleBeatAction } from "./actions";
import type { AdminBeatData } from "@/lib/beat/queries";

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type CoverageRow = { agent_id: string; agent_name: string; on_a_beat: number | string; not_on_a_beat: number | string; coverage_percent: number | string };
type AdherenceRow = { beat_id: string; beat_name: string; agent_name: string; planned: number | string; visited: number | string; productive: number | string; adherence_percent: number | string };
type SuggestionRow = { customer_id: string; business_name: string; area_code: string; reason_text: string };
type VendorGroupRow = { id: string; name: string };

export function BeatAdminView({ data, canManage }: { data: AdminBeatData; canManage: boolean }) {
  const t = useTranslations("beat");
  const coverage = data.coverage as CoverageRow[];
  const adherence = data.adherence as AdherenceRow[];
  const suggestions = data.suggestions as SuggestionRow[];
  const vendorGroups = data.vendorGroups as VendorGroupRow[];
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedBeat, setSelectedBeat] = useState("");
  const [plannedDate, setPlannedDate] = useState("");

  function showError(event: FormEvent<HTMLFormElement>) {
    setError("");
    setMessage("");
    const form = event.currentTarget;
    form.querySelectorAll("[data-action-error]").forEach((node) => node.remove());
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-primary">{t("createBeat")}</h2>
          <form action={createBeatAction} onSubmit={showError} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-primary">{t("name")}<input name="name" required minLength={2} placeholder={t("namePlaceholder")} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
            <label className="block text-sm font-medium text-primary">{t("agent")}<select name="agentId" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">{t("agent")}</option>{data.agents.map((agent) => { const user = Array.isArray(agent.user) ? agent.user[0] : agent.user; return <option key={agent.id} value={agent.id}>{user?.full_name ?? agent.agent_code} · {agent.territory}</option>; })}</select></label>
            <label className="block text-sm font-medium text-primary">{t("day")}<select name="dayOfWeek" defaultValue="1" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">{dayKeys.map((key, index) => <option key={key} value={index}>{t(`dayNames.${key}` as never)}</option>)}</select></label>
            <label className="block text-sm font-medium text-primary">{t("targetFrequency")}<input name="targetFrequencyDays" type="number" min="1" defaultValue="30" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
            <label className="block text-sm font-medium text-primary md:col-span-2">{t("areaCodes")}<textarea name="areaCodes" rows={3} placeholder={t("areaCodesHint")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /><span className="mt-1 block text-sm text-muted-foreground">{t("areaCodesHint")}</span></label>
            <div className="md:col-span-2"><Button type="submit">{t("create")}</Button></div>
          </form>
          {data.agents.length === 0 ? <p className="mt-3 text-sm text-[#D6202C]">{t("noAgents")}</p> : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold text-primary">{t("coverage")}</h2><p className="text-sm text-muted-foreground">{t("coverageDescription")}</p></div>
        {coverage.length === 0 ? <EmptyState title={t("noAgents")} description={t("coverageDescription")} /> : <div className="grid gap-3 md:grid-cols-2">{coverage.map((row) => <article key={row.agent_id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-primary">{row.agent_name}</h3><strong className="text-primary"><bdi>{row.coverage_percent}%</bdi></strong></div><p className="mt-2 text-sm text-muted-foreground">{t("onBeat")}: <bdi>{row.on_a_beat}</bdi> · {t("noBeat")}: <bdi>{row.not_on_a_beat}</bdi></p></article>)}</div>}
      </section>

      <section className="space-y-3"><div><h2 className="text-lg font-semibold text-primary">{t("adherence")}</h2><p className="text-sm text-muted-foreground">{t("adherenceDescription")}</p></div>{adherence.length === 0 ? <EmptyState title={t("adherence")} description={t("noTodayStopsHint")} /> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-start text-sm"><thead className="bg-slate-50 text-primary"><tr><th className="p-3">{t("name")}</th><th className="p-3">{t("planned")}</th><th className="p-3">{t("visited")}</th><th className="p-3">{t("productive")}</th><th className="p-3">{t("adherencePercent")}</th></tr></thead><tbody>{adherence.map((row) => <tr key={row.beat_id} className="border-t border-slate-100"><td className="p-3 font-medium text-primary">{row.beat_name} · {row.agent_name}</td><td className="p-3"><bdi>{row.planned}</bdi></td><td className="p-3"><bdi>{row.visited}</bdi></td><td className="p-3"><bdi>{row.productive}</bdi></td><td className="p-3"><bdi>{row.adherence_percent}%</bdi></td></tr>)}</tbody></table></div>}</section>

      <section className="space-y-3"><h2 className="text-lg font-semibold text-primary">{t("createBeat")}</h2>{data.beats.length === 0 ? <EmptyState title={t("noBeats")} description={t("noBeatsHint")} /> : <div className="grid gap-3 md:grid-cols-2">{data.beats.map((beat) => <article key={beat.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary">{beat.name}</h3><p className="mt-1 text-sm text-muted-foreground">{beat.area_codes.length ? beat.area_codes.join(", ") : t("areaCodes")}</p><p className="mt-1 text-sm text-muted-foreground">{t(`dayNames.${dayKeys[beat.day_of_week]}` as never)} · <bdi>{beat.customers?.length ?? 0}</bdi> {t("assignedCustomers")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-primary">{beat.is_active ? t("active") : t("inactive")}</span></div>{canManage ? <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2"><form action={planBeatAction}><input type="hidden" name="beatId" value={beat.id} /><input type="date" name="plannedDate" value={selectedBeat === beat.id ? plannedDate : ""} onChange={(event) => { setSelectedBeat(beat.id); setPlannedDate(event.target.value); }} required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" /><Button type="submit" variant="outline">{t("planStops")}</Button></form><form action={toggleBeatAction}><input type="hidden" name="beatId" value={beat.id} /><input type="hidden" name="isActive" value={String(!beat.is_active)} /><Button type="submit" variant="outline">{beat.is_active ? t("deactivate") : t("activate")}</Button></form></div><div className="rounded-md border border-slate-200 p-3"><p className="text-sm font-semibold text-primary">{t("targetScope")}</p><form action={createBeatFrequencyTargetAction} className="mt-2 grid gap-2 sm:grid-cols-2"><input type="hidden" name="beatId" value={beat.id} /><select name="customerType" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">{t("customerType")}</option>{["AUTO_PARTS", "OIL_CHANGE", "CAR_WASH", "DETAILING", "PAINT_HARDWARE", "FUEL_STATION", "DISTRIBUTOR", "OTHER"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><select name="vendorGroupId" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">{t("noVendorGroup")}</option>{vendorGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><input name="frequencyDays" type="number" min="1" defaultValue={beat.target_frequency_days} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" /><Button type="submit" variant="outline">{t("saveFrequency")}</Button></form></div></div> : null}</article>)}</div>}</section>

      <section className="space-y-3"><div><h2 className="text-lg font-semibold text-primary">{t("suggestions")}</h2><p className="text-sm text-muted-foreground">{t("suggestionsDescription")}</p></div>{suggestions.length === 0 ? <EmptyState title={t("noSuggestions")} description={t("noSuggestionsHint")} /> : <div className="grid gap-3 md:grid-cols-2">{suggestions.map((row) => <article key={row.customer_id} className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-semibold text-primary">{row.business_name}</h3><p className="mt-1 text-sm text-muted-foreground">{row.area_code} · {row.reason_text}</p></article>)}</div>}</section>
      {message ? <p role="status" className="text-sm font-medium text-primary">{message}</p> : null}{error ? <p role="alert" className="text-sm font-medium text-[#D6202C]">{error}</p> : null}
    </div>
  );
}
