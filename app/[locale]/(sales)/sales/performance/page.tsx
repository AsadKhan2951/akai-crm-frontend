import { requirePermission } from "@/lib/auth/server";
import { getSalesPerformanceData } from "@/lib/sales/queries";
import { PerformanceView } from "./PerformanceView";

export default async function SalesPerformancePage() {
  await requirePermission("dashboard.view");
  const data = await getSalesPerformanceData();
  return <PerformanceView data={data as never} />;
}
