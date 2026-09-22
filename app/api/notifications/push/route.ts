import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  await requirePermission("notification.view");
  try {
    const payload = (await request.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth || !payload.endpoint.startsWith("https://")) return Response.json({ error: "The push subscription is incomplete." }, { status: 400 });
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });
    const { error } = await supabase.from("web_push_subscriptions").upsert({ user_id: user.id, endpoint: payload.endpoint, p256dh: payload.keys.p256dh, auth: payload.keys.auth, updated_at: new Date().toISOString() }, { onConflict: "user_id,endpoint" });
    if (error) return Response.json({ error: "The push subscription could not be saved." }, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "The push subscription could not be saved." }, { status: 500 });
  }
}
