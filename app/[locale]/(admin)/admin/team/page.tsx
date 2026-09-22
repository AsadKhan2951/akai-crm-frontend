import { requirePermission } from "@/lib/auth/server";
import { getAdminTeamMetrics } from "@/lib/admin/queries";
import { TeamView } from "../records/RecordLists";
export default async function AdminTeamPage() { await requirePermission("dashboard.view", { asNotFound: true }); const data = await getAdminTeamMetrics(); return <TeamView metrics={data.metrics as never} progress={data.progress as never} />; }
