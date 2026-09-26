"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { findSalesCustomersNearMe } from "../actions";

type Customer = { customer_id: string; business_name: string; area_code: string; latitude: string | number | null; longitude: string | number | null; last_order_at: string | null };
type Nearby = { customer_id: string; business_name: string; area_code: string; distance_meters: string | number };

function recencyClass(value: string | null) {
  if (!value) return "bg-[#b42318]";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 30) return "bg-[#15171c]";
  if (days <= 90) return "bg-[#5e6470]";
  return "bg-[#b42318]";
}

export function RouteView({ customers }: { customers: Customer[] }) {
  const t = useTranslations("sales");
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  function findNearby() {
    setMessage("");
    if (!navigator.geolocation) { setMessage(t("locationError")); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      startTransition(() => { void findSalesCustomersNearMe(String(position.coords.latitude), String(position.coords.longitude)).then(setNearby).catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("errors.generic"))); });
    }, () => setMessage(t("locationError")));
  }
  return <div className="space-y-6"><PageHeader title={t("routeTitle")} description={t("routeDescription")} /><section className="space-y-3"><div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-primary" />0–30 days</span><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-500" />31–90 days</span><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#b42318]" />90+ days / no recent order</span></div>{customers.length === 0 ? <EmptyState title={t("noCustomers")} description={t("noCustomersHint")} /> : <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-label={t("routeTitle")}><div className="absolute inset-0 bg-slate-100" />{customers.map((customer, index) => { const left = `${12 + ((index * 37) % 76)}%`; const top = `${14 + ((index * 53) % 70)}%`; return <div key={customer.customer_id} className="absolute" style={{ left, top }}><span className={`block h-4 w-4 rounded-full border-2 border-white ${recencyClass(customer.last_order_at)}`} title={`${customer.business_name} · ${customer.area_code}`} /><span className="absolute start-5 top-0 hidden whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-primary shadow-sm sm:block">{customer.business_name}</span></div>; })}<p className="absolute bottom-3 start-3 rounded bg-white/90 px-3 py-2 text-xs text-muted-foreground">{t("nearbyHint")}</p></div>}</section><section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-primary">{t("customersNearMe")}</h2><p className="text-sm text-muted-foreground">{t("nearbyHint")}</p></div><Button type="button" onClick={findNearby} disabled={isPending}>{t("findNearby")}</Button></div>{message ? <p className="text-sm text-[#b42318]" role="alert">{message}</p> : null}{nearby.length === 0 ? <EmptyState title={t("noNearby")} description={t("noNearbyHint")} /> : <div className="divide-y divide-slate-100">{nearby.map((item) => <div key={item.customer_id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium text-primary">{item.business_name}</p><p className="text-sm text-muted-foreground">{item.area_code}</p></div><p className="text-sm text-primary"><bdi>{item.distance_meters}</bdi> m</p></div>)}</div>}</section></div>;
}
