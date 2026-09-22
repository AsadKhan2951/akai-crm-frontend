import { requirePermission } from "@/lib/auth/server";
import { getAdminDashboardData } from "@/lib/admin/queries";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ rangeStart?: string; rangeEnd?: string }> }) {
  await requirePermission("dashboard.view", { asNotFound: true });
  const params = await searchParams;
  const rangeStart = params.rangeStart ?? "";
  const rangeEnd = params.rangeEnd ?? "";
  const data = await getAdminDashboardData(rangeStart, rangeEnd);
  return <AdminDashboard summary={data.summary} analytics={data.analytics} anomalies={data.anomalies as never} rangeStart={rangeStart} rangeEnd={rangeEnd} />;
}
