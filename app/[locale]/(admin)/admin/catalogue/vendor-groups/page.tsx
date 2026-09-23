import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { assignVendorGroupAction, makeDefaultVendorGroupAction, saveVendorGroupAction } from "../visibility-actions";

const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

export default async function VendorGroupsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requirePermission("vendorgroup.manage", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "visibility" });
  const tc = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const supabase = await getSupabaseServerClient();
  let customerQuery = supabase.from("customers").select("id,business_name,area_code,vendor_group_id").eq("is_internal_account", false).order("business_name").limit(300);
  if (q) customerQuery = customerQuery.or(`business_name.ilike.%${q.replace(/[%,()]/g, "")}%,area_code.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [groups, customers] = await Promise.all([
    supabase.from("vendor_groups").select("id,name,description,is_default,show_all_by_default,customers(count)").order("name"),
    customerQuery,
  ]);
  const groupRows = (groups.data ?? []) as Array<{ id: string; name: string; description: string | null; is_default: boolean; show_all_by_default: boolean; customers: Array<{ count: number }> }>;
  const groupName = new Map(groupRows.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{tc("catalogueTitle")}</Link>
      <PageHeader title={tc("vendorGroupsTitle")} description={tc("vendorGroupsDescription")} />
      <FlashMessage status={sp.status} code={sp.code} />

      <details className="rounded-lg border border-slate-200 bg-white p-4" open={groupRows.length === 0}>
        <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-primary">{t("createGroup")}</summary>
        <form action={saveVendorGroupAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm font-medium text-primary">{t("groupName")}<input name="name" required className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("groupDescription")}<input name="description" className={input} /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="showAll" className="h-5 w-5" />{t("showAllByDefault")}</label>
          <div><button type="submit" className="min-h-11 rounded-md bg-[#D6202C] px-5 font-semibold text-white">{t("createGroupAction")}</button></div>
        </form>
      </details>

      {groupRows.length === 0 ? <EmptyState title={t("noGroups")} description={t("noGroupsHint")} /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {groupRows.map((g) => (
            <li key={g.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{g.name} {g.is_default ? <span className="ms-2 rounded-full bg-primary px-2 py-0.5 text-sm text-white">{t("defaultGroup")}</span> : null}</p>
                  <p className="text-sm text-muted-foreground"><bdi>{g.customers?.[0]?.count ?? 0}</bdi> {t("customers")} · {g.show_all_by_default ? t("showAllByDefault") : ta("restrictedByDefault")}</p>
                </div>
                <Link href={`/admin/catalogue/visibility?scope=GROUP&id=${g.id}` as never} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-3 text-sm text-primary">{tc("visibilityTitle")}</Link>
              </div>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-primary">{tc("edit")}</summary>
                <form action={saveVendorGroupAction} className="mt-2 space-y-2">
                  <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={g.id} />
                  <label className="block text-sm font-medium text-primary">{t("groupName")}<input name="name" required defaultValue={g.name} className={input} /></label>
                  <label className="block text-sm font-medium text-primary">{t("groupDescription")}<input name="description" defaultValue={g.description ?? ""} className={input} /></label>
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="showAll" defaultChecked={g.show_all_by_default} className="h-5 w-5" />{t("showAllByDefault")}</label>
                  <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{t("saveGroup")}</button>
                </form>
                {!g.is_default ? <form action={makeDefaultVendorGroupAction} className="mt-2"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={g.id} /><button type="submit" className="min-h-11 rounded-md border border-slate-300 px-3 text-primary">{t("makeDefault")}</button></form> : null}
              </details>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-primary">{t("bulkAssignTitle")}</h2>
        <form method="get" role="search" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder={t("searchGroupsAndCustomers")} aria-label={t("searchGroupsAndCustomers")} className="min-h-11 flex-1 rounded-md border border-slate-300 px-3" />
          <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("search")}</button>
        </form>
        {(customers.data ?? []).length === 0 ? <EmptyState title={t("noCustomersForAssignment")} description={t("noCustomersForAssignmentHint")} /> : (
          <form action={assignVendorGroupAction} className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {(customers.data ?? []).map((c) => (
                <label key={c.id} className="flex min-h-11 items-center gap-3 rounded px-2 hover:bg-[#F1F5F9]">
                  <input type="checkbox" name="customerIds" value={c.id} className="h-5 w-5" />
                  <span className="text-primary">{c.business_name}</span>
                  <bdi className="text-sm text-muted-foreground">{c.area_code}</bdi>
                  <span className="ms-auto text-sm text-muted-foreground">{c.vendor_group_id ? groupName.get(c.vendor_group_id) : "—"}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select name="groupId" required className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" aria-label={t("selectGroup")}><option value="">{t("selectGroup")}</option>{groupRows.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <button type="submit" className="min-h-11 rounded-md bg-[#D6202C] px-4 font-semibold text-white">{t("assignCustomers")}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
