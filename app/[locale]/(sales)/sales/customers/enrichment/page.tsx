import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { getAuthUser, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EnrichmentForm } from "./EnrichmentForm";

const COLS = "id,business_name,business_name_urdu,contact_person_name,primary_phone,whatsapp_phone,email,full_address,area_code,latitude,longitude,customer_type,customer_type_suggestion,status,vendor_group_id,credit_limit_pkr,assigned_agent_id,data_complete,duplicate_review_required";

export default async function SalesCustomerEnrichmentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ skip?: string; customerId?: string }> }) {
  await requirePermission("customer.enrich");
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "customerImport" });
  const tp = await getTranslations({ locale, namespace: "customerProfile" });
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const supabase = await getSupabaseServerClient();
  const single = /^[0-9a-f-]{36}$/i.test(sp.customerId ?? "") ? sp.customerId! : null;
  const skip = Math.max(0, Number.parseInt(sp.skip ?? "0", 10) || 0);

  const { data: agent } = await supabase.from("sales_agents").select("id").eq("user_id", user.id).maybeSingle();
  if (!agent && !single) return <EmptyState title={t("agentNotConfigured")} description={t("agentNotConfiguredHint")} />;

  const customerQuery = single
    ? supabase.from("customers").select(COLS).eq("id", single).limit(1)
    : supabase.from("customers").select(COLS).eq("assigned_agent_id", agent!.id).eq("data_complete", false).eq("is_internal_account", false)
        .order("area_code", { ascending: true }).order("normalized_name", { ascending: true }).range(skip, skip);
  const [{ data: customers, error }, { count: totalCount }, { count: completedCount }, { data: areaRows }] = await Promise.all([
    customerQuery,
    agent ? supabase.from("customers").select("id", { count: "exact", head: true }).eq("assigned_agent_id", agent.id).eq("is_internal_account", false) : Promise.resolve({ count: 0 }),
    agent ? supabase.from("customers").select("id", { count: "exact", head: true }).eq("assigned_agent_id", agent.id).eq("is_internal_account", false).eq("data_complete", true) : Promise.resolve({ count: 0 }),
    supabase.from("area_codes").select("code,full_name_en,full_name_ur").order("code"),
  ]);
  if (error) throw new Error("The customer enrichment queue could not be loaded.");
  const customer = customers?.[0];
  const areas = ((areaRows ?? []) as Array<{ code: string; full_name_en: string | null; full_name_ur: string | null }>).map((a) => ({ value: a.code, label: `${a.code}${(locale === "ur" ? a.full_name_ur : a.full_name_en) ? ` · ${locale === "ur" ? a.full_name_ur : a.full_name_en}` : ""}` }));

  return (
    <div className="space-y-6">
      <PageHeader title={single ? tp("editProfile") : t("enrichmentTitle")} description={single ? undefined : t("enrichmentDescription")} />
      {customer
        ? <EnrichmentForm customer={customer as never} completed={completedCount ?? 0} total={totalCount ?? 0} areas={areas} skip={skip} single={!!single} />
        : <EmptyState title={skip ? t("noCustomers") : t("noCustomers")} description={t("noCustomersHint")} />}
    </div>
  );
}
