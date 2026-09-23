import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminUsers } from "@/lib/admin/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UsersView } from "./UsersView";

export default async function AdminUsersPage() {
  await requirePermission("user.view", { asNotFound: true });
  const supabase = await getSupabaseServerClient();
  const [data, canCreate, canUpdate, canDeactivate, customers] = await Promise.all([
    getAdminUsers(),
    hasCurrentUserPermission("user.create"),
    hasCurrentUserPermission("user.update"),
    hasCurrentUserPermission("user.deactivate"),
    supabase.from("customers").select("id,business_name,area_code").eq("is_internal_account", false).order("business_name").limit(2000),
  ]);
  return <UsersView users={data.users as never} roles={data.roles as never} invites={data.invites as never} customers={(customers.data ?? []) as never} canCreate={canCreate} canUpdate={canUpdate} canDeactivate={canDeactivate} />;
}
