import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminUsers, getAdminCustomers, getAdminPermissionRisks } from "@/lib/admin/queries";
import { AccessView } from "./AccessView";
export default async function AdminAccessPage() { await requirePermission("role.view", { asNotFound: true }); const [data, customerData, risks, canImpersonate] = await Promise.all([getAdminUsers(), getAdminCustomers({}), getAdminPermissionRisks(), hasCurrentUserPermission("impersonate.vendor")]); return <AccessView users={data.users as never} customers={customerData.customers as never} risks={risks as never} canImpersonate={canImpersonate} />; }
