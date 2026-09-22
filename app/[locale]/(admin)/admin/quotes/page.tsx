import { requirePermission } from "@/lib/auth/server";
import { getAdminQuotes } from "@/lib/admin/queries";
import { AdminRecordList } from "../records/RecordLists";
export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) { await requirePermission("quote.view", { asNotFound: true }); const query = await searchParams; const rows = await getAdminQuotes(query.search ?? "", query.status ?? ""); return <AdminRecordList kind="quotes" rows={rows as never} query={query} />; }
