import { requirePermission } from "@/lib/auth/server";
import { getAdminOrders } from "@/lib/admin/queries";
import { AdminRecordList } from "../records/RecordLists";
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) { await requirePermission("order.view", { asNotFound: true }); const query = await searchParams; const rows = await getAdminOrders(query.search ?? "", query.status ?? ""); return <AdminRecordList kind="orders" rows={rows as never} query={query} />; }
