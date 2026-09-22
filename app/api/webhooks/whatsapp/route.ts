import { getSystemSupabaseClient } from "@/lib/admin/system-job";
import { verifyWhatsAppWebhookSignature } from "@/lib/messaging/meta-signature";
import { handleIncomingWhatsAppMessage } from "@/lib/admin/whatsapp-assistant-system-job";

type WhatsAppMessage = { id: string; from: string; timestamp?: string; type?: string; text?: { body?: string } };
type WhatsAppStatus = { id: string; status: "sent" | "delivered" | "read" | "failed"; errors?: Array<{ title?: string; message?: string }> };

async function claimEvent(supabase: ReturnType<typeof getSystemSupabaseClient>, externalId: string, payload: unknown) {
  const { error } = await supabase.from("message_webhook_events").insert({ provider: "meta", external_id: externalId, payload_json: payload });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error("Webhook event deduplication could not be recorded.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("hub.verify_token") !== process.env.META_WHATSAPP_VERIFY_TOKEN) return new Response("Forbidden", { status: 403 });
  return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWhatsAppWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  let payload: { entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[]; statuses?: WhatsAppStatus[] } }> }> };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid webhook JSON." }, { status: 400 });
  }
  const supabase = getSystemSupabaseClient();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const message of value.messages ?? []) {
        if (!(await claimEvent(supabase, `message:${message.id}`, message))) continue;
        await handleIncomingWhatsAppMessage(message);
      }
      for (const status of value.statuses ?? []) {
        if (!(await claimEvent(supabase, `status:${status.id}:${status.status}`, status))) continue;
        const mapped = status.status === "sent" ? "SENT" : status.status === "delivered" ? "DELIVERED" : status.status === "read" ? "READ" : "FAILED";
        await supabase.from("message_logs").update({ status: mapped, error_message: status.errors?.[0]?.message ?? null, updated_at: new Date().toISOString() }).eq("provider", "meta").eq("provider_message_id", status.id);
      }
    }
  }
  return Response.json({ received: true });
}
