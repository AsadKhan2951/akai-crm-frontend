import { requirePermission } from "@/lib/auth/server";
import { getDeliveryAdminData } from "@/lib/delivery/queries";
import { DeliveryAdminView } from "./DeliveryAdminView";

export default async function AdminDeliveryPage() {
  await requirePermission("delivery.view");
  const data = await getDeliveryAdminData();
  return <DeliveryAdminView orders={data.orders as never} runs={data.runs as never} pickingLists={data.pickingLists as never} />;
}
