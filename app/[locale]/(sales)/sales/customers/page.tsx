import { requirePermission } from "@/lib/auth/server";
import { getSalesCustomerList } from "@/lib/sales/queries";
import { CustomersTable } from "./CustomersTable";

export default async function SalesCustomersPage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("customer.view");
  const { locale } = await params;
  const data = await getSalesCustomerList("", "", "");
  return <CustomersTable locale={locale} customers={data.customers} areas={data.areas} />;
}
