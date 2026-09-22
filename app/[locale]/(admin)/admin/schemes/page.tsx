import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminSchemes, getSchemePerformance } from "@/lib/schemes/queries";
import { formatKarachiDate } from "@/lib/sales/time";
import { getTranslations } from "next-intl/server";
import { SchemeBuilder } from "./SchemeBuilder";
import { activateTradeScheme } from "./actions";

export default async function AdminSchemesPage() {
  await requirePermission("scheme.view", { asNotFound: true });
  const [t, schemes, canCreate, canActivate, canAnalytics] = await Promise.all([getTranslations("scheme"), getAdminSchemes(), hasCurrentUserPermission("scheme.create"), hasCurrentUserPermission("scheme.activate"), hasCurrentUserPermission("scheme.analytics")]);
  const performance = canAnalytics ? await Promise.all(schemes.map(async (scheme) => [scheme.id, await getSchemePerformance(scheme.id)] as const)) : [];
  const performanceByScheme = new Map(performance);
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="text-muted-foreground">{t("description")}</p></header>
    {canCreate ? <SchemeBuilder /> : null}
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      {schemes.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold">{t("noResults")}</p><p className="text-muted-foreground">{t("noResultsHint")}</p></div> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-start text-sm"><thead className="bg-slate-50"><tr><th className="p-3">{t("nameEn")}</th><th className="p-3">{t("schemeType")}</th><th className="p-3">{t("startsAt")}</th><th className="p-3">{t("endsAt")}</th><th className="p-3">{t("active")}</th><th className="p-3">{t("activate")}</th></tr></thead><tbody>{schemes.map((scheme) => <tr key={scheme.id} className="border-t border-slate-100"><td className="p-3"><div className="font-semibold">{scheme.name_en}</div><div className="font-urdu text-muted-foreground" dir="rtl">{scheme.name_ur}</div></td><td className="p-3"><bdi>{scheme.scheme_type}</bdi></td><td className="p-3"><bdi>{formatKarachiDate(scheme.starts_at)}</bdi></td><td className="p-3"><bdi>{formatKarachiDate(scheme.ends_at)}</bdi></td><td className="p-3">{scheme.is_active ? t("active") : t("inactive")}</td><td className="p-3">{canActivate && !scheme.is_active ? <form action={activateTradeScheme}><input type="hidden" name="schemeId" value={scheme.id} /><button type="submit" className="min-h-11 rounded-md bg-primary px-3 font-semibold text-white">{t("activate")}</button></form> : "—"}</td></tr>)}</tbody></table></div>}
      {canAnalytics ? <div className="grid gap-3 md:grid-cols-2">{schemes.map((scheme) => { const stats = performanceByScheme.get(scheme.id); return <article key={`${scheme.id}-performance`} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-primary">{scheme.name_en}</h3><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">{t("unitsMoved")}</p><p><bdi>{stats?.units_moved ?? "0"}</bdi></p></div><div><p className="text-muted-foreground">{t("revenue")}</p><p><bdi>PKR {stats?.revenue_pkr ?? "0.00"}</bdi></p></div><div><p className="text-muted-foreground">{t("benefitCost")}</p><p><bdi>PKR {stats?.benefit_cost_pkr ?? "0.00"}</bdi></p></div><div><p className="text-muted-foreground">{t("participatingDealers")}</p><p><bdi>{stats?.participating_dealers ?? 0}</bdi></p></div></div></article>; })}</div> : null}
    </section>
  </div>;
}
