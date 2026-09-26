import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { LinkTabs } from "@/components/admin/ui/Tabs";
import { buttonClass } from "@/components/admin/ui/Button";
import { CustomerFilters } from "@/components/admin/customers/CustomerFilters";
import { CustomerTable } from "@/components/admin/customers/CustomerTable";
import { getCustomers } from "@/lib/admin/ops";
import type { CustomerView } from "@/lib/admin/types";

type SP = { view?: string; q?: string; search?: string; agent?: string; area?: string; type?: string; status?: string; group?: string; page?: string };
const VIEWS: CustomerView[] = ["all", "incomplete", "unassigned", "duplicates", "internal"];

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("customer.view", { asNotFound: true });
  const raw = await searchParams;
  // Older links used ?search=
  const sp: SP = { ...raw, q: raw.q ?? raw.search };
  delete sp.search;
  const t = await getTranslations("console.customers");
  const [data, canAssign, canUpdate, canEnrich, canExport] = await Promise.all([
    getCustomers({ view: sp.view as CustomerView | undefined, q: sp.q, agent: sp.agent, area: sp.area, type: sp.type, status: sp.status, group: sp.group, page: Number(sp.page) || 1 }),
    hasCurrentUserPermission("customer.reassign_agent"),
    hasCurrentUserPermission("customer.update"),
    hasCurrentUserPermission("customer.enrich"),
    hasCurrentUserPermission("customer.export"),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = next.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };
  const exportQuery = new URLSearchParams(Object.entries(sp).filter(([key, v]) => v && key !== "page") as [string, string][]).toString();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { n: data.counts.all })}
        actions={canExport ? <a href={`/api/admin/customers/export${exportQuery ? `?${exportQuery}` : ""}`} className={buttonClass("secondary")}>{t("export")}</a> : undefined} />
      <div className="flex flex-col gap-3.5">
        <LinkTabs items={VIEWS.map((v) => ({ key: v, label: t(`views.${v}`), href: qs({ view: v === "all" ? undefined : v, page: undefined }), count: data.counts[v], active: data.view === v }))} />
        <Suspense fallback={null}><CustomerFilters agents={data.agents} areas={data.areas} /></Suspense>
        <CustomerTable key={JSON.stringify(sp)} rows={data.rows} agents={data.agents} total={data.total} page={data.page} pageSize={data.pageSize}
          pageHrefTemplate={qs({ page: "__PAGE__" })} canAssign={canAssign} canEdit={canUpdate || canEnrich} />
      </div>
    </>
  );
}
