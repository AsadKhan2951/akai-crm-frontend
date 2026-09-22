import { queueWarrantyExpiryReminders } from "@/lib/admin/warranty-system-job";
import { requireCronSecret } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await queueWarrantyExpiryReminders();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return Response.json({ ok: false, error: unauthorized ? "Unauthorized" : "Warranty reminders failed." }, { status: unauthorized ? 401 : 500 });
  }
}
