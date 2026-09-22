import "server-only";

import { getSystemSupabaseClient } from "./system-job";

export async function queueClaimSlaBreachNotifications() {
  const supabase = getSystemSupabaseClient();
  const [{ data: breaches, error: breachError }, { data: admins, error: adminError }] = await Promise.all([
    supabase.rpc("claim_sla_breach_rows"),
    supabase.rpc("claim_sla_admin_user_ids"),
  ]);
  if (breachError || adminError) throw new Error("Claim SLA evidence could not be loaded.");
  let queued = 0;
  for (const breach of breaches ?? []) {
    for (const admin of admins ?? []) {
      const linkUrl = `/admin/claims?claimId=${encodeURIComponent(String(breach.claim_id))}`;
      const { data: existing } = await supabase.from("notifications").select("id").eq("user_id", admin.user_id).eq("type", "CLAIM_SLA_BREACH").eq("link_url", linkUrl).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).maybeSingle();
      if (existing) continue;
      const { error } = await supabase.from("notifications").insert({ user_id: admin.user_id, type: "CLAIM_SLA_BREACH", title_en: "Claim SLA breach", title_ur: "Claim SLA کی خلاف ورزی", body: `Claim ${breach.claim_number} has passed its ${breach.breach_type} review target.`, body_en: `Claim ${breach.claim_number} has passed its ${breach.breach_type} review target.`, body_ur: `Claim ${breach.claim_number} کا ${breach.breach_type} review target گزر گیا ہے۔`, link_url: linkUrl });
      if (error) throw new Error("Claim SLA notification could not be queued.");
      queued += 1;
    }
  }
  return { queued, breaches: breaches?.length ?? 0 };
}
