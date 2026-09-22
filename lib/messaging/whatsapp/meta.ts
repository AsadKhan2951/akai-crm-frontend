import type { MessagingProvider, OutboundMessage, ProviderSendResult } from "../types";

export const metaWhatsAppProvider: MessagingProvider = {
  name: "meta",
  async send(message: OutboundMessage): Promise<ProviderSendResult> {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) throw new Error("Meta WhatsApp is not configured. Add META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in the hosting environment.");
    if (message.channel !== "WHATSAPP") throw new Error("Meta WhatsApp can only send WhatsApp messages.");
    const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v23.0";
    const templateName = typeof message.metadataJson?.providerTemplateName === "string" ? message.metadataJson.providerTemplateName : null;
    const templateLanguage = message.locale ?? "en";
    const templateParameters = Array.isArray(message.metadataJson?.templateParameters) ? message.metadataJson.templateParameters : [];
    const payload = templateName
      ? { messaging_product: "whatsapp", to: message.toAddress, type: "template", template: { name: templateName, language: { code: templateLanguage }, components: templateParameters.length ? [{ type: "body", parameters: templateParameters.map((text) => ({ type: "text", text: String(text) })) }] : undefined } }
      : { messaging_product: "whatsapp", to: message.toAddress, type: "text", text: { preview_url: false, body: message.body } };
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
    const providerMessageId = result.messages?.[0]?.id;
    if (!response.ok || !providerMessageId) throw new Error(result.error?.message || `Meta WhatsApp returned HTTP ${response.status}.`);
    return { providerMessageId, status: "SENT" };
  },
};
