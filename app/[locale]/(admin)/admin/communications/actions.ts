"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createUnsubscribeToken } from "@/lib/messaging/unsubscribe";
import { getMessageTemplate, listMessageTemplateKeys } from "@/lib/messaging/templates";
import type { MessageTemplateKey } from "@/lib/messaging/types";
import type { MessageChannel } from "@/lib/types/db-enums";

const CAMPAIGN_PAGE_SIZE = 500;

type CampaignFilters = { areaCode: string | null; customerType: string | null; vendorGroupId: string | null; assignedAgentId: string | null };
type CampaignCustomer = { id: string; email: string | null; whatsapp_phone: string | null; area_code: string; customer_type: string; vendor_group_id: string | null; assigned_agent_id: string | null };

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }

async function getCustomerPage(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, filters: CampaignFilters, offset: number) {
  let query = supabase.from("customers").select("id,business_name,email,whatsapp_phone,area_code,customer_type,vendor_group_id,assigned_agent_id").eq("status", "ACTIVE").eq("is_internal_account", false);
  if (filters.areaCode) query = query.eq("area_code", filters.areaCode);
  if (filters.customerType) query = query.eq("customer_type", filters.customerType);
  if (filters.vendorGroupId) query = query.eq("vendor_group_id", filters.vendorGroupId);
  if (filters.assignedAgentId) query = query.eq("assigned_agent_id", filters.assignedAgentId);
  const { data, error } = await query.order("id", { ascending: true }).range(offset, offset + CAMPAIGN_PAGE_SIZE - 1);
  if (error) throw new Error("Eligible campaign customers could not be loaded. Check your customer scope and filters.");
  return (data ?? []) as CampaignCustomer[];
}

export async function retryCommunicationMessage(formData: FormData) {
  await requirePermission("message.send");
  const id = text(formData, "messageId");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Choose a valid failed message before retrying.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("message_logs").update({ status: "QUEUED", attempt_count: 0, error_message: null, next_attempt_at: new Date().toISOString(), locked_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "FAILED");
  if (error) throw new Error("The message could not be queued again. Review the provider configuration and try again.");
  revalidatePath("/[locale]/admin/communications", "page");
}

export async function saveWhatsAppTemplate(formData: FormData) {
  await requirePermission("whatsapp.manage_templates");
  const key = text(formData, "templateKey");
  const locale = text(formData, "locale");
  const providerTemplateName = text(formData, "providerTemplateName");
  const approvalStatus = text(formData, "approvalStatus") || "DRAFT";
  if (!key || !["en", "ur"].includes(locale) || !/^[a-z0-9_]{3,120}$/.test(providerTemplateName) || !["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].includes(approvalStatus)) throw new Error("Enter a valid Meta template name, locale, and approval status.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { error } = await supabase.from("message_templates").upsert({ key, channel: "WHATSAPP", locale, provider_template_name: providerTemplateName, approval_status: approvalStatus, body: "Managed in Meta WhatsApp Business Manager.", updated_at: new Date().toISOString(), created_by_user_id: user.id }, { onConflict: "key,channel,locale" });
  if (error) throw new Error("The WhatsApp template status could not be saved. Check the template name and try again.");
  revalidatePath("/[locale]/admin/communications", "page");
}

export async function queueCommunicationCampaign(formData: FormData) {
  await requirePermission("message.campaign");
  await requirePermission("customer.view");
  const name = text(formData, "name");
  const channel = text(formData, "channel") as "EMAIL" | "WHATSAPP";
  const templateKey = text(formData, "templateKey") as MessageTemplateKey;
  const operatorLocale = text(formData, "locale") === "ur" ? "ur" : "en";
  const filters: CampaignFilters = { areaCode: text(formData, "areaCode") || null, customerType: text(formData, "customerType") || null, vendorGroupId: text(formData, "vendorGroupId") || null, assignedAgentId: text(formData, "assignedAgentId") || null };
  if (!name || !["EMAIL", "WHATSAPP"].includes(channel) || !listMessageTemplateKeys().includes(templateKey)) throw new Error("Enter a campaign name, channel, and valid template.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { data: campaign, error: campaignError } = await supabase.from("messaging_campaigns").insert({ name, channel, template_key: templateKey, segment_json: { ...filters, operatorLocale }, status: "QUEUED", created_by_user_id: user.id, queued_at: new Date().toISOString() }).select("id").single();
  if (campaignError || !campaign) throw new Error("The campaign could not be queued. Nothing was sent.");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let offset = 0;
  let queued = 0;
  try {
    const { data: approvedTemplates } = channel === "WHATSAPP" ? await supabase.from("message_templates").select("key,locale,provider_template_name").eq("channel", "WHATSAPP").eq("approval_status", "APPROVED").eq("is_active", true) : { data: [] };
    const approvedTemplateMap = new Map((approvedTemplates ?? []).map((row) => [`${row.key}:${row.locale}`, row.provider_template_name]));
    if (channel === "WHATSAPP" && (!approvedTemplateMap.get(`${templateKey}:en`) || !approvedTemplateMap.get(`${templateKey}:ur`))) throw new Error("WhatsApp campaigns require an approved Meta template for both English and Urdu before queueing.");
    while (true) {
      const customers = await getCustomerPage(supabase, filters, offset);
      if (customers.length === 0) break;
      const customerIds = customers.map((customer) => customer.id);
      const [unsubscribeResult, accountResult] = await Promise.all([
        supabase.from("message_unsubscribes").select("customer_id").eq("channel", channel).in("customer_id", customerIds),
        supabase.from("vendor_accounts").select("customer_id,user_id").in("customer_id", customerIds),
      ]);
      if (unsubscribeResult.error) throw new Error("Unsubscribe preferences could not be checked. Campaign sending was stopped.");
      if (accountResult.error) throw new Error("Recipient account preferences could not be loaded. Campaign sending was stopped.");
      const blocked = new Set((unsubscribeResult.data ?? []).map((row) => row.customer_id));
      const accountUserIds = (accountResult.data ?? []).map((row) => row.user_id);
      const { data: users, error: userError } = accountUserIds.length ? await supabase.from("users").select("id,preferred_locale").in("id", accountUserIds) : { data: [], error: null };
      if (userError) throw new Error("Recipient language preferences could not be loaded. Campaign sending was stopped.");
      const localeByCustomer = new Map<string, "en" | "ur">();
      const userLocale = new Map((users ?? []).map((row) => [row.id, row.preferred_locale === "ur" ? "ur" as const : "en" as const]));
      for (const account of accountResult.data ?? []) localeByCustomer.set(account.customer_id, userLocale.get(account.user_id) ?? operatorLocale);
      const logs = customers.filter((customer) => !blocked.has(customer.id)).flatMap((customer) => {
        const recipient = channel === "EMAIL" ? customer.email : customer.whatsapp_phone;
        if (!recipient) return [];
        const locale = localeByCustomer.get(customer.id) ?? operatorLocale;
        const template = getMessageTemplate(templateKey, locale, { message: "AKAI update", count: "0", reportName: name });
        const token = createUnsubscribeToken(customer.id, channel as MessageChannel);
        const unsubscribeUrl = baseUrl ? `${baseUrl}/api/messaging/unsubscribe?customerId=${customer.id}&channel=${channel}&token=${token}` : "";
        const providerTemplateName = channel === "WHATSAPP" ? approvedTemplateMap.get(`${templateKey}:${locale}`) : undefined;
        return [{ channel, direction: "OUTBOUND", customer_id: customer.id, to_address: recipient, template_name: templateKey, body: unsubscribeUrl ? `${template.body}\n\nUnsubscribe: ${unsubscribeUrl}` : template.body, subject: template.subject, provider: channel === "EMAIL" ? "resend" : "meta", metadata_json: { campaignId: campaign.id, locale, providerTemplateName, unsubscribeUrl }, status: "QUEUED", attempt_count: 0, next_attempt_at: new Date().toISOString() }];
      });
      if (logs.length) {
        const { error: logError } = await supabase.from("message_logs").insert(logs);
        if (logError) throw new Error("The campaign could not queue all messages. Review the campaign and retry the failed batch.");
        queued += logs.length;
      }
      offset += customers.length;
      if (customers.length < CAMPAIGN_PAGE_SIZE) break;
    }
  } catch (error) {
    await supabase.from("messaging_campaigns").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("id", campaign.id);
    throw error;
  }
  revalidatePath("/[locale]/admin/communications", "page");
  return { campaignId: campaign.id, queued };
}

export async function setWhatsAppKillSwitch(formData: FormData) {
  await requirePermission("whatsapp.kill_switch");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_whatsapp_kill_switch", { p_enabled: enabled });
  if (error) throw new Error("The WhatsApp assistant state could not be changed. Check your permission and try again.");
  revalidatePath("/[locale]/admin/communications", "page");
}

export async function resetWhatsAppSession(formData: FormData) {
  await requirePermission("whatsapp.kill_switch");
  const phone = text(formData, "phone");
  if (!/^\+92\d{10}$/.test(phone)) throw new Error("Choose a valid Pakistani WhatsApp number.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reset_whatsapp_session", { p_phone: phone });
  if (error) throw new Error("The WhatsApp session could not be reset. Refresh and try again.");
  revalidatePath("/[locale]/admin/communications", "page");
}

export async function setWhatsAppOrderCeiling(formData: FormData) {
  await requirePermission("whatsapp.kill_switch");
  const ceiling = String(formData.get("ceiling") ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(ceiling) || /^0+(?:\.0{1,2})?$/.test(ceiling)) throw new Error("Enter a positive PKR amount.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_whatsapp_order_ceiling", { p_ceiling: ceiling });
  if (error) throw new Error("The WhatsApp order ceiling could not be saved. Check the amount and try again.");
  revalidatePath("/[locale]/admin/communications", "page");
}
