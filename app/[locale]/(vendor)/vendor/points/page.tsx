import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVendorLoyaltyData } from "@/lib/loyalty/queries";
import { getTranslations } from "next-intl/server";
import { PointsView } from "./PointsView";

export default async function VendorPointsPage() {
  await requirePermission("loyalty.view", { asNotFound: true });
  const t = await getTranslations("loyalty");
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) throw new Error(t("accountNotConfigured"));
  const data = await getVendorLoyaltyData(customerId);
  return <PointsView balance={data.customer.loyalty_points_balance ?? 0} rewards={data.rewards} transactions={data.transactions} redemptions={data.redemptions} />;
}
