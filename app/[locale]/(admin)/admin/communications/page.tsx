import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CommunicationsView } from "./CommunicationsView";
import { WhatsAppAdminControls } from "./WhatsAppAdminControls";

export default async function CommunicationsPage() {
  await requirePermission("message.send", { asNotFound: true });
  const canCampaign = await hasCurrentUserPermission("message.campaign");
  const canManageTemplates = await hasCurrentUserPermission("whatsapp.manage_templates");
  const canKillSwitch = await hasCurrentUserPermission("whatsapp.kill_switch");
  const canGenerateContent = await hasCurrentUserPermission("ai.generate_content");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("message_logs").select("id,channel,to_address,template_name,body,status,error_message,attempt_count,created_at").eq("status", "FAILED").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Failed messages could not be loaded. Refresh and try again.");
  const { data: templates } = canManageTemplates ? await supabase.from("message_templates").select("key,locale,provider_template_name,approval_status").eq("channel", "WHATSAPP").order("key") : { data: [] };
  const { data: settings } = canKillSwitch ? await supabase.rpc("get_whatsapp_assistant_settings") : { data: [] };
  const { data: rawSessions } = await supabase.from("whatsapp_sessions").select("phone,state,customer_id,last_message_at").order("last_message_at", { ascending: false }).limit(100);
  const customerIds = (rawSessions ?? []).map((session) => session.customer_id).filter((id): id is string => Boolean(id));
  const { data: customers } = customerIds.length ? await supabase.from("customers").select("id,business_name").in("id", customerIds) : { data: [] };
  const customerNames = new Map((customers ?? []).map((customer) => [customer.id, customer.business_name]));
  const sessions = (rawSessions ?? []).map((session) => ({ phone: session.phone, state: session.state, last_message_at: session.last_message_at, customerName: customerNames.get(session.customer_id ?? "") ?? "", customerId: session.customer_id }));
  const assistantSettings = (settings?.[0] as { enabled?: boolean; order_ceiling_pkr?: string | number } | undefined) ?? { enabled: true, order_ceiling_pkr: "100000" };
  return <div className="space-y-6"><WhatsAppAdminControls enabled={assistantSettings.enabled !== false} orderCeiling={String(assistantSettings.order_ceiling_pkr ?? "100000")} canKillSwitch={canKillSwitch} sessions={sessions} /><CommunicationsView failedMessages={data ?? []} canCampaign={canCampaign} canManageTemplates={canManageTemplates} canGenerateContent={canGenerateContent} templates={templates ?? []} /></div>;
}
