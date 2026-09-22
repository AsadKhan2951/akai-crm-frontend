import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminUsers } from "@/lib/admin/queries";
import { UsersView } from "./UsersView";
export default async function AdminUsersPage() { await requirePermission("user.view", { asNotFound: true }); const [data, canCreate, canUpdate, canDeactivate] = await Promise.all([getAdminUsers(), hasCurrentUserPermission("user.create"), hasCurrentUserPermission("user.update"), hasCurrentUserPermission("user.deactivate")]); return <UsersView users={data.users as never} roles={data.roles as never} invites={data.invites as never} canCreate={canCreate} canUpdate={canUpdate} canDeactivate={canDeactivate} />; }
