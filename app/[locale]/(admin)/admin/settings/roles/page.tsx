import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminRoles } from "@/lib/admin/queries";
import { RolesView } from "./RolesView";
export default async function AdminRolesPage() { await requirePermission("role.create", { asNotFound: true }); const [data, canCreate, canUpdate, canDelete] = await Promise.all([getAdminRoles(), hasCurrentUserPermission("role.create"), hasCurrentUserPermission("role.update"), hasCurrentUserPermission("role.delete")]); return <RolesView roles={data.roles as never} permissions={data.permissions as never} links={data.links as never} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />; }
