import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/server";
import { getAdminEffectivePermissions } from "@/lib/admin/queries";
import { EffectivePermissionsView } from "./EffectivePermissionsView";
export default async function AdminEffectivePermissionsPage({ params }: { params: Promise<{ userId: string }> }) { await requirePermission("user.view", { asNotFound: true }); const { userId } = await params; try { const data = await getAdminEffectivePermissions(userId); return <EffectivePermissionsView user={data.user as never} permissions={data.permissions as never} />; } catch { notFound(); } }
