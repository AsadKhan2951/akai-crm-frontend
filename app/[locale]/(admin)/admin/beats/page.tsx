import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getAdminBeatData } from "@/lib/beat/queries";
import { BeatAdminView } from "./BeatAdminView";

export default async function AdminBeatsPage() {
  await requirePermission("beat.view");
  const [data, canManage] = await Promise.all([getAdminBeatData(), hasCurrentUserPermission("beat.manage")]);
  return <BeatAdminView data={data} canManage={canManage} />;
}
