import { getAdminDashboardData } from "@/lib/admin/queries";
import { AdminDashboard } from "./AdminDashboard";

/** Streams in after the overview: the detailed analytics (date range, brands, areas, alerts). */
export async function AnalyticsSection({ rangeStart, rangeEnd, title, subtitle }: { rangeStart: string; rangeEnd: string; title: string; subtitle: string }) {
  let data: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null;
  try {
    data = await getAdminDashboardData(rangeStart, rangeEnd);
  } catch {
    data = null;
  }
  if (!data) return null;
  return <AdminDashboard analytics={data.analytics} anomalies={data.anomalies as never} rangeStart={rangeStart} rangeEnd={rangeEnd} title={title} subtitle={subtitle} />;
}
