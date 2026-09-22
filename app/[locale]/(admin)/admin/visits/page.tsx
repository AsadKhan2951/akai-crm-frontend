import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { requirePermission } from "@/lib/auth/server";
import { getAdminVisitActivities } from "@/lib/sales/queries";

export default async function AdminVisitsPage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("activity.view");
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sales" });
  const visits = await getAdminVisitActivities();
  return <div className="space-y-6"><PageHeader title={t("visitsTitle")} description={t("visitsDescription")} />{visits.length === 0 ? <EmptyState title={t("noVisits")} description={t("noVisitsHint")} /> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">{t("agent")}</th><th className="p-3">{t("customer")}</th><th className="p-3">{t("date")}</th><th className="p-3">{t("distance")}</th><th className="p-3">{t("location")}</th><th className="p-3">{t("notes")}</th></tr></thead><tbody>{visits.map((visit) => { const distance = visit.distance_from_customer_meters == null ? null : String(visit.distance_from_customer_meters); const warning = distance !== null && Number.parseFloat(distance) >= 1000; return <tr key={visit.id} className="border-t border-slate-100"><td className="p-3"><bdi>{visit.agent_id}</bdi></td><td className="p-3"><bdi>{visit.customer_id ?? "—"}</bdi></td><td className="p-3"><bdi>{new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(visit.occurred_at))}</bdi></td><td className={`p-3 font-medium ${warning ? "text-[#D6202C]" : "text-primary"}`}>{distance === null ? "—" : <><bdi>{distance}</bdi> m{warning ? ` · ${t("distanceWarning")}` : ""}</>}</td><td className="p-3"><bdi>{visit.latitude ?? "—"}, {visit.longitude ?? "—"}</bdi></td><td className="p-3">{visit.notes || "—"}</td></tr>; })}</tbody></table></div>}</div>;
}
