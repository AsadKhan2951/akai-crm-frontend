import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminCustomers } from "@/lib/admin/queries";
import { CustomersView } from "./CustomersView";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("customer.view", { asNotFound: true });
  const params = await searchParams;
  const query = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""]));
  const [data, canReassign, canExport] = await Promise.all([getAdminCustomers(query), hasCurrentUserPermission("customer.reassign_agent"), hasCurrentUserPermission("customer.export")]);
  return <CustomersView customers={data.customers as never} agents={data.agents as never} areas={data.areas as never} groups={data.groups as never} canReassign={canReassign} canExport={canExport} query={query} />;
}
