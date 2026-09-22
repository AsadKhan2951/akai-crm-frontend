import { requirePermission } from "@/lib/auth/server";
import { getAdminAuditLog } from "@/lib/admin/queries";
import { AuditView } from "./AuditView";
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) { await requirePermission("auditlog.view", { asNotFound: true }); const params = await searchParams; const rows = await getAdminAuditLog(params.search ?? ""); return <AuditView rows={rows as never} search={params.search ?? ""} />; }
