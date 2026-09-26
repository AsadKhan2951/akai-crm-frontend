import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";

export default async function EnrichmentProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission("customer.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "customerImport" });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("customer_enrichment_progress").select("sales_agent_id,agent_code,sales_agent_name,total_customers,completed_customers,remaining_customers").order("agent_code");
  if (error) throw new Error(t("noProgress"));
  const rows = data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title={t("progressTitle")} description={t("progressDescription")} />
      {rows.length === 0 ? <EmptyState title={t("noProgress")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => {
            const total = Number(row.total_customers ?? 0);
            const done = Number(row.completed_customers ?? 0);
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <article key={String(row.sales_agent_id)} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-primary">{String(row.sales_agent_name ?? row.agent_code)}</h2><bdi className="text-2xl font-bold text-primary">{percent}%</bdi></div>
                <div className="h-3 overflow-hidden rounded-full bg-[#f1f0ec]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div>
                <p className="text-sm text-muted-foreground">{t("progressOf", { completed: done, total })} · {t("remaining")}: <bdi>{Number(row.remaining_customers ?? 0)}</bdi></p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
