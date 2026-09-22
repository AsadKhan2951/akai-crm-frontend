"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cacheOfflineRead } from "@/lib/pwa/read-cache";

type Customer = { customer_id: string; business_name: string; area_code: string; customer_type: string; primary_phone: string | null; whatsapp_phone: string | null; last_activity_at: string | null; last_order_at: string | null };
type Area = { code: string; full_name_en: string; full_name_ur: string };

function formatDate(value: string | null, locale: string) {
  return value ? new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function CustomersTable({ locale, customers, areas }: { locale: string; customers: Customer[]; areas: Area[] }) {
  const t = useTranslations("sales");
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  useEffect(() => { void getSupabaseBrowserClient().auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => { if (data.user) void cacheOfflineRead(data.user.id, "sales-customers", { customers, areas }); }); }, [areas, customers]);
  const filtered = useMemo(() => customers.filter((customer) => {
    const haystack = `${customer.business_name} ${customer.area_code} ${customer.primary_phone ?? ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!area || customer.area_code === area) && (!type || customer.customer_type === type);
  }), [area, customers, search, type]);
  return <div className="space-y-6"><PageHeader title={t("customersTitle")} description={t("customersDescription")} /><div className="grid gap-3 md:grid-cols-[1fr_220px_220px]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchCustomers")} aria-label={t("searchCustomers")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" /><select value={area} onChange={(event) => setArea(event.target.value)} aria-label={t("filterArea")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">{t("allAreas")}</option>{areas.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select><select value={type} onChange={(event) => setType(event.target.value)} aria-label={t("filterType")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="">{t("allTypes")}</option>{["AUTO_PARTS", "OIL_CHANGE", "CAR_WASH", "DETAILING", "PAINT_HARDWARE", "FUEL_STATION", "DISTRIBUTOR", "OTHER"].map((item) => <option key={item} value={item}>{t(`types.${item}` as never)}</option>)}</select></div>{filtered.length === 0 ? <EmptyState title={t("noCustomers")} description={t("noCustomersHint")} /> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-primary"><tr><th className="p-3">{t("businessName")}</th><th className="p-3">{t("area")}</th><th className="p-3">{t("filterType")}</th><th className="p-3">{t("phone")}</th><th className="p-3">{t("activity")}</th><th className="p-3"><span className="sr-only">{t("openCustomer")}</span></th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.customer_id} className="border-t border-slate-100"><td className="p-3 font-medium text-primary">{customer.business_name}</td><td className="p-3">{customer.area_code}</td><td className="p-3">{t(`types.${customer.customer_type}` as never)}</td><td className="p-3"><bdi>{customer.primary_phone ?? "—"}</bdi></td><td className="p-3"><bdi>{formatDate(customer.last_activity_at, locale)}</bdi></td><td className="p-3"><ButtonLink href={`/sales/customers/${customer.customer_id}`}>{t("openCustomer")}</ButtonLink></td></tr>)}</tbody></table></div>}</div>;
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href as never} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-semibold text-white hover:opacity-90">{children}</Link>;
}
