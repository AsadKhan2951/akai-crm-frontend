import { requirePermission } from "@/lib/auth/server";
import { getSalesRouteCustomers } from "@/lib/sales/queries";
import { RouteView } from "./RouteView";

export default async function SalesRoutePage() {
  await requirePermission("customer.view");
  const customers = await getSalesRouteCustomers();
  return <RouteView customers={customers} />;
}
