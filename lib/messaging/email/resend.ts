import type { MessagingProvider, OutboundMessage, ProviderSendResult } from "../types";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export const resendProvider: MessagingProvider = {
  name: "resend",
  async send(message: OutboundMessage): Promise<ProviderSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) throw new Error("Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in the hosting environment.");
    if (message.channel !== "EMAIL") throw new Error("Resend can only send email messages.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.toAddress],
        subject: message.subject ?? "AKAI CRM",
        text: message.body,
        html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(message.body)}</pre>`,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok || !payload.id) throw new Error(payload.message || `Resend returned HTTP ${response.status}.`);
    return { providerMessageId: payload.id, status: "SENT" };
  },
};
