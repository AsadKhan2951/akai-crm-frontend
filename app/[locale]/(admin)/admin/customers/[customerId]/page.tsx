import { notFound } from "next/navigation";
import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminCustomerDetail } from "@/lib/admin/queries";
import { CustomerDetail } from "./CustomerDetail";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  await requirePermission("customer.view", { asNotFound: true });
  const { customerId } = await params;
  try {
    const [data, canRecordPayment, canDelete] = await Promise.all([getAdminCustomerDetail(customerId), hasCurrentUserPermission("ledger.record_payment"), hasCurrentUserPermission("customer.delete")]);
    return <CustomerDetail data={data as never} canRecordPayment={canRecordPayment} canDelete={canDelete} />;
  } catch {
    notFound();
  }
}
