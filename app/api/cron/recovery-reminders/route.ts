import { getSystemSupabaseClient, requireCronSecret } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const threshold = new URL(request.url).searchParams.get("thresholdDays");
    const parsed = threshold && /^\d+$/.test(threshold) ? Number.parseInt(threshold, 10) : 30;
    const supabase = getSystemSupabaseClient();
    const { data, error } = await supabase.rpc("queue_due_recovery_reminders", { p_threshold_days: parsed });
    if (error) return Response.json({ error: "Recovery reminders could not be queued." }, { status: 500 });
    return Response.json({ queued: data ?? 0, sent: 0, note: "Drafts queued; outbound delivery is handled by the communications phase." });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
