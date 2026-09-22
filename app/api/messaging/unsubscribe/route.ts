import { getSystemSupabaseClient } from "@/lib/admin/system-job";
import { verifyUnsubscribeToken } from "@/lib/messaging/unsubscribe";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId") ?? "";
  const channel = url.searchParams.get("channel") as "EMAIL" | "WHATSAPP";
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(customerId) || !["EMAIL", "WHATSAPP"].includes(channel) || !verifyUnsubscribeToken(customerId, channel, token)) return new Response("This unsubscribe link is invalid or expired.", { status: 400 });
  const supabase = getSystemSupabaseClient();
  const { error } = await supabase.from("message_unsubscribes").upsert({ customer_id: customerId, channel });
  if (error) return new Response("Your unsubscribe request could not be saved. Please contact AKAI.", { status: 500 });
  return new Response(`You are unsubscribed from ${channel.toLowerCase()} campaign messages.`, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
