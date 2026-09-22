import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MessageInboxView } from "@/components/MessageInboxView";

export default async function SalesMessagesPage() {
  await requirePermission("message.send", { asNotFound: true });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("message_logs").select("id,customer_id,sender_address,to_address,body,status,thread_key,direction,created_at").eq("channel", "WHATSAPP").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Message inbox could not be loaded. Refresh and try again.");
  return <MessageInboxView messages={data ?? []} />;
}
