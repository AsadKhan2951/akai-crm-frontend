import "server-only";
import type { MessageTemplateKey, OutboundMessage, SupportedLocale } from "./types";
import { getMessageTemplate } from "./templates";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function enqueueMessage(message: OutboundMessage) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("message_logs").insert({
    channel: message.channel,
    direction: "OUTBOUND",
    customer_id: message.customerId ?? null,
    lead_id: message.leadId ?? null,
    to_address: message.toAddress,
    template_name: message.templateName ?? null,
    body: message.body,
    subject: message.subject ?? null,
    provider: message.provider ?? (message.channel === "EMAIL" ? "resend" : "meta"),
    thread_key: message.threadKey ?? null,
    metadata_json: message.metadataJson ?? null,
    status: "QUEUED",
    attempt_count: 0,
    next_attempt_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !data) throw new Error("The message was not queued. Check the recipient and your communication permission.");
  return data.id as string;
}

export async function enqueueTemplatedMessage(input: {
  channel: "EMAIL" | "WHATSAPP";
  toAddress: string;
  templateName: MessageTemplateKey;
  locale: SupportedLocale;
  values?: Record<string, string>;
  customerId?: string;
  leadId?: string;
  threadKey?: string;
  providerTemplateName?: string;
  templateParameters?: string[];
}) {
  const template = getMessageTemplate(input.templateName, input.locale, input.values);
  return enqueueMessage({
    channel: input.channel,
    toAddress: input.toAddress,
    subject: template.subject,
    body: template.body,
    templateName: input.templateName,
    locale: input.locale,
    customerId: input.customerId,
    leadId: input.leadId,
    threadKey: input.threadKey,
    metadataJson: {
      providerTemplateName: input.providerTemplateName,
      templateParameters: input.templateParameters,
      locale: input.locale,
    },
  });
}

export async function getCurrentUserNotifications(limit = 30) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title_en,title_ur,body,body_en,body_ur,link_url,is_read,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error("Notifications could not be loaded. Refresh the page and try again.");
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) throw new Error("The notification could not be marked as read. Refresh and try again.");
}
