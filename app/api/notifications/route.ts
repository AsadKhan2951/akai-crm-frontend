import { requirePermission } from "@/lib/auth/server";
import { getCurrentUserNotifications, markNotificationRead } from "@/lib/messaging/service";

export async function GET() {
  await requirePermission("notification.view");
  try {
    return Response.json({ notifications: await getCurrentUserNotifications() });
  } catch {
    return Response.json({ error: "Notifications could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requirePermission("notification.view");
  try {
    const payload = (await request.json()) as { notificationId?: string };
    if (!payload.notificationId || !/^[0-9a-f-]{36}$/i.test(payload.notificationId)) return Response.json({ error: "Choose a valid notification." }, { status: 400 });
    await markNotificationRead(payload.notificationId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "The notification could not be marked as read." }, { status: 500 });
  }
}
