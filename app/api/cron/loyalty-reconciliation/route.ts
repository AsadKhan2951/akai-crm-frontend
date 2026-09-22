import { reconcileLoyaltyBalancesSystemJob } from "@/lib/admin/loyalty-system-job";
import { requireCronSecret } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const mismatches = await reconcileLoyaltyBalancesSystemJob();
    return Response.json({ mismatches });
  } catch {
    return Response.json({ error: "Loyalty reconciliation could not be completed." }, { status: 500 });
  }
}
