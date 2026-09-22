import { requirePermission } from "@/lib/auth/server";
import { getAdminApprovals } from "@/lib/admin/queries";
import { ApprovalsView } from "./ApprovalsView";

export default async function AdminApprovalsPage() {
  await requirePermission("order.approve", { asNotFound: true });
  const rows = await getAdminApprovals();
  return <ApprovalsView rows={rows as never} />;
}
