import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminReports } from "@/lib/admin/queries";
import { ReportsView } from "./ReportsView";
export default async function AdminReportsPage() { await requirePermission("report.build", { asNotFound: true }); const [data, canSchedule] = await Promise.all([getAdminReports(), hasCurrentUserPermission("report.schedule")]); return <ReportsView definitions={data.definitions as never} runs={data.runs as never} canSchedule={canSchedule} />; }
