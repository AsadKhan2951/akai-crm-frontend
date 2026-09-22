import "server-only";
import { getSystemSupabaseClient } from "./system-job";
import { sendWebPush } from "@/lib/messaging/web-push";

export async function processWebPushNotifications(limit = 100) {
  const supabase = getSystemSupabaseClient();
  const { data: notifications, error: notificationError } = await supabase.from("notifications").select("id,user_id,title_en,title_ur,body,link_url,created_at").gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: true }).limit(Math.min(Math.max(limit, 1), 500));
  if (notificationError) throw new Error("Push notifications could not be loaded.");
  const userIds = [...new Set((notifications ?? []).map((notification) => notification.user_id))];
  if (!userIds.length) return { notifications: 0, sent: 0, gone: 0, failed: 0 };
  const { data: subscriptions, error: subscriptionError } = await supabase.from("web_push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds);
  if (subscriptionError) throw new Error("Push subscriptions could not be loaded.");
  const { data: users, error: userError } = await supabase.from("users").select("id,preferred_locale").in("id", userIds);
  if (userError) throw new Error("Push recipient preferences could not be loaded.");
  const localeByUser = new Map((users ?? []).map((user) => [user.id, user.preferred_locale === "ur" ? "ur" : "en"]));
  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions ?? []) subscriptionsByUser.set(subscription.user_id, [...(subscriptionsByUser.get(subscription.user_id) ?? []), subscription]);
  let sent = 0;
  let gone = 0;
  let failed = 0;
  for (const notification of notifications ?? []) {
    for (const subscription of subscriptionsByUser.get(notification.user_id) ?? []) {
      const { data: existingDelivery, error: existingError } = await supabase.from("notification_push_deliveries").select("id,status").eq("notification_id", notification.id).eq("subscription_id", subscription.id).maybeSingle();
      if (existingError) { failed += 1; continue; }
      if (existingDelivery?.status === "SENT" || existingDelivery?.status === "GONE") continue;
      let deliveryId = existingDelivery?.id;
      if (deliveryId) {
        await supabase.from("notification_push_deliveries").update({ status: "QUEUED", error_message: null }).eq("id", deliveryId);
      } else {
        const { data: delivery, error: claimError } = await supabase.from("notification_push_deliveries").insert({ notification_id: notification.id, subscription_id: subscription.id, status: "QUEUED" }).select("id").maybeSingle();
        if (claimError?.code === "23505") continue;
        if (claimError || !delivery) { failed += 1; continue; }
        deliveryId = delivery.id;
      }
      try {
        const title = localeByUser.get(notification.user_id) === "ur" ? notification.title_ur : notification.title_en;
        const result = await sendWebPush(subscription, { title, body: notification.body, linkUrl: notification.link_url });
        if (result.status === "GONE") {
          await supabase.from("notification_push_deliveries").update({ status: "GONE", sent_at: new Date().toISOString() }).eq("id", deliveryId);
          await supabase.from("web_push_subscriptions").delete().eq("id", subscription.id);
          gone += 1;
        } else {
          await supabase.from("notification_push_deliveries").update({ status: "SENT", sent_at: new Date().toISOString(), error_message: null }).eq("id", deliveryId);
          sent += 1;
        }
      } catch (error) {
        await supabase.from("notification_push_deliveries").update({ status: "FAILED", error_message: (error instanceof Error ? error.message : "Push provider failure.").slice(0, 1000) }).eq("id", deliveryId);
        failed += 1;
      }
    }
  }
  return { notifications: notifications?.length ?? 0, sent, gone, failed };
}
