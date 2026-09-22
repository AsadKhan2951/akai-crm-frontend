import { getSystemSupabaseClient } from "@/lib/admin/system-job";
import { verifyResendWebhookSignature } from "@/lib/messaging/resend-signature";

type ResendEvent = { type?: string; created_at?: string; data?: { email_id?: string; id?: string; to?: string[]; reason?: string; bounce?: { type?: string; message?: string } } };

function statusForEvent(type: string) {
  if (type === "email.sent") return "SENT" as const;
  if (["email.delivered", "email.opened", "email.clicked"].includes(type)) return "DELIVERED" as const;
  if (type === "email.received") return "RECEIVED" as const;
  if (["email.bounced", "email.failed", "email.complained", "email.delivery_delayed"].includes(type)) return "FAILED" as const;
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = verifyResendWebhookSignature(rawBody, { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") });
  if (!verified) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  let event: ResendEvent;
  try { event = JSON.parse(rawBody) as ResendEvent; } catch { return Response.json({ error: "Invalid webhook JSON." }, { status: 400 }); }
  const eventId = request.headers.get("svix-id");
  const emailId = event.data?.email_id ?? event.data?.id;
  const status = statusForEvent(event.type ?? "");
  if (!eventId || !emailId || !status) return Response.json({ received: true });
  const supabase = getSystemSupabaseClient();
  const { error: eventError } = await supabase.from("message_webhook_events").insert({ provider: "resend", external_id: eventId, payload_json: event });
  if (eventError?.code === "23505") return Response.json({ received: true, duplicate: true });
  if (eventError) return Response.json({ error: "Webhook event could not be recorded." }, { status: 500 });
  const errorMessage = status === "FAILED" ? event.data?.bounce?.message ?? event.data?.reason ?? `Resend event: ${event.type}` : null;
  const { error } = await supabase.from("message_logs").update({ status, error_message: errorMessage, sent_at: status === "DELIVERED" || status === "SENT" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("provider", "resend").eq("provider_message_id", emailId);
  if (error) return Response.json({ error: "Message delivery status could not be saved." }, { status: 500 });
  return Response.json({ received: true });
}
