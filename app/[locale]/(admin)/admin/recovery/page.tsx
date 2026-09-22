import { requirePermission } from "@/lib/auth/server";
import { getAdminRecoveryDashboard } from "@/lib/recovery/queries";
import { AdminRecoveryView } from "./AdminRecoveryView";

export default async function AdminRecoveryPage() {
  await requirePermission("collection.view", { asNotFound: true });
  const data = await getAdminRecoveryDashboard();
  return <AdminRecoveryView data={data as never} />;
}
