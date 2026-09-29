import { notFound } from "next/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminCustomerDetail } from "@/lib/admin/queries";
import { getAgents } from "@/lib/admin/ops";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerDetail } from "./CustomerDetail";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ locale: string; customerId: string }> }) {
  await requirePermission("customer.view", { asNotFound: true });
  const { locale, customerId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) notFound();
  let data: Awaited<ReturnType<typeof getAdminCustomerDetail>>;
  try {
    data = await getAdminCustomerDetail(customerId);
  } catch {
    notFound();
  }
  const supabase = await getSupabaseServerClient();
  const [agents, { data: groups }, { data: areas }, canRecordPayment, canDelete, canUpdate, canEnrich, canCredit, canReassign] = await Promise.all([
    getAgents(),
    supabase.from("vendor_groups").select("id,name").order("name"),
    supabase.from("area_codes").select("code,full_name_en,full_name_ur").order("code"),
    hasCurrentUserPermission("ledger.record_payment"),
    hasCurrentUserPermission("customer.delete"),
    hasCurrentUserPermission("customer.update"),
    hasCurrentUserPermission("customer.enrich"),
    hasCurrentUserPermission("creditlimit.manage"),
    hasCurrentUserPermission("customer.reassign_agent"),
  ]);
  return (
    <CustomerDetail
      data={data as never}
      locale={locale}
      agents={agents.map((a) => ({ value: a.id, label: a.name }))}
      groups={((groups ?? []) as Array<{ id: string; name: string }>).map((g) => ({ value: g.id, label: g.name }))}
      areas={((areas ?? []) as Array<{ code: string; full_name_en: string | null; full_name_ur: string | null }>).map((a) => ({ value: a.code, label: `${a.code}${(locale === "ur" ? a.full_name_ur : a.full_name_en) ? ` · ${locale === "ur" ? a.full_name_ur : a.full_name_en}` : ""}` }))}
      perms={{ canRecordPayment, canDelete, canUpdate, canEnrich, canCredit, canReassign }}
    />
  );
}
