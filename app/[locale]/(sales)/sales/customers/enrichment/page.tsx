import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EnrichmentForm } from "./EnrichmentForm";

export default async function SalesCustomerEnrichmentPage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("customer.enrich");
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "customerImport" });
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: agent } = await supabase.from("sales_agents").select("id").eq("user_id", user.id).maybeSingle();
  if (!agent) {
    return <EmptyState title={t("agentNotConfigured")} description={t("agentNotConfiguredHint")} />;
  }

  const [{ data: customers, error }, { count: totalCount }, { count: completedCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,business_name,area_code,customer_type,customer_type_suggestion,duplicate_review_required")
      .eq("assigned_agent_id", agent.id)
      .eq("data_complete", false)
      .eq("is_internal_account", false)
      .order("area_code", { ascending: true })
      .order("normalized_name", { ascending: true })
      .limit(1),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("assigned_agent_id", agent.id).eq("is_internal_account", false),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("assigned_agent_id", agent.id).eq("is_internal_account", false).eq("data_complete", true),
  ]);

  if (error) throw new Error("The customer enrichment queue could not be loaded.");
  const total = totalCount ?? 0;
  const completed = completedCount ?? 0;
  const customer = customers?.[0];

  return (
    <div className="space-y-6">
      <PageHeader title={t("enrichmentTitle")} description={t("enrichmentDescription")} />
      {customer ? <EnrichmentForm customer={customer} completed={completed} total={total} locale={locale} /> : <EmptyState title={t("noCustomers")} description={t("noCustomersHint")} />}
    </div>
  );
}
