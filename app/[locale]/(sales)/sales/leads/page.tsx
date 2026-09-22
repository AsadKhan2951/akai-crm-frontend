import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getScopedSalesAgents } from "@/lib/sales/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { LeadsBoard } from "./LeadsBoard";

export default async function SalesLeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("lead.view");
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sales" });
  const supabase = await getSupabaseServerClient();
  const [{ data: leads, error }, canImport, agents] = await Promise.all([
    supabase.from("lead_pipeline_cards").select("id,business_name,contact_name,phone,area_code,estimated_value_pkr,stage,days_in_stage,ai_score,ai_score_reason").order("stage_entered_at", { ascending: true }).limit(500),
    hasCurrentUserPermission("lead.import"),
    getScopedSalesAgents(),
  ]);
  if (error) throw new Error(t("errors.generic"));
  return <LeadsBoard leads={leads ?? []} agents={agents} canImport={canImport} />;
}
