import { queueClaimSlaBreachNotifications } from "@/lib/admin/claims-system-job";
import { requireCronSecret } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await queueClaimSlaBreachNotifications();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return Response.json({ ok: false, error: unauthorized ? "Unauthorized" : "Claim SLA notifications failed." }, { status: unauthorized ? 401 : 500 });
  }
}
