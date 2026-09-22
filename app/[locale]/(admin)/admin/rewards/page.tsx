import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getAdminLoyaltyData } from "@/lib/loyalty/queries";
import { RewardsAdminView } from "./RewardsAdminView";

export default async function AdminRewardsPage() {
  const [canCreate, canApprove, canAdjust] = await Promise.all([hasCurrentUserPermission("reward.manage"), hasCurrentUserPermission("redemption.approve"), hasCurrentUserPermission("loyalty.adjust")]);
  if (!canCreate && !canApprove && !canAdjust) await requirePermission("reward.manage", { asNotFound: true });
  const data = await getAdminLoyaltyData();
  return <RewardsAdminView rewards={data.rewards} redemptions={data.redemptions} liability={data.liability} popularity={data.popularity} canCreate={canCreate} canApprove={canApprove} canAdjust={canAdjust} />;
}
