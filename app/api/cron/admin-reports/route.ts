import { requireCronSecret, getSystemSupabaseClient } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const supabase = getSystemSupabaseClient();
    const [{ data: queued, error: queueError }, { data: anomalies, error: anomalyError }] = await Promise.all([
      supabase.rpc("queue_due_admin_reports"),
      supabase.rpc("generate_admin_anomaly_alerts"),
    ]);
    if (queueError || anomalyError) return Response.json({ error: "Admin scheduled work failed." }, { status: 500 });
    return Response.json({ queuedReports: queued ?? 0, anomalyAlerts: anomalies ?? 0 });
  } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
}
