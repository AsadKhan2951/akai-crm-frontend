import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PermissionDeniedError, requirePermission } from "@/lib/auth/server";
import type { PermissionKey } from "@/lib/auth/permissions";
import { assertCanGrantPermissions, expandPermissionDependencies } from "@/lib/auth/engine";

export class RolePolicyError extends Error {
  readonly code = "ROLE_POLICY_VIOLATION";
}

export async function getCurrentPermissionKeySet() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new PermissionDeniedError("role.view");
  const { data, error } = await supabase.rpc("permission_keys", { uid: user.id });
  if (error) throw new Error("Permission data could not be loaded.");
  return {
    userId: user.id,
    permissions: new Set<string>((data ?? []).map((row: { permission_key: string }) => row.permission_key)),
  };
}

export async function assertMayGrantPermissions(permissionKeys: PermissionKey[]) {
  const { permissions } = await getCurrentPermissionKeySet();
  try {
    assertCanGrantPermissions(permissions, permissionKeys);
  } catch (error) {
    throw new RolePolicyError(error instanceof Error ? error.message : "You may only grant permissions you hold yourself.");
  }
}

export async function resolvePermissionGrantClosure(permissionKeys: PermissionKey[]) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("permission_dependencies")
    .select("permission:permissions!permission_id(key), requires_permission:permissions!requires_permission_id(key)");
  if (error) throw new Error("Permission dependencies could not be loaded.");

  const dependencies = new Map<PermissionKey, PermissionKey[]>();
  for (const row of data ?? []) {
    const dependent = Array.isArray(row.permission) ? row.permission[0] : row.permission;
    const prerequisite = Array.isArray(row.requires_permission) ? row.requires_permission[0] : row.requires_permission;
    if (!dependent?.key || !prerequisite?.key) continue;
    const current = dependencies.get(dependent.key as PermissionKey) ?? [];
    current.push(prerequisite.key as PermissionKey);
    dependencies.set(dependent.key as PermissionKey, current);
  }
  return [...expandPermissionDependencies(permissionKeys, dependencies)];
}

export async function assertMayCreateRole(permissionKeys: PermissionKey[]) {
  await requirePermission("role.create");
  await assertMayGrantPermissions(await resolvePermissionGrantClosure(permissionKeys));
}

export async function assertMayEditRole(roleId: string, permissionKeys: PermissionKey[]) {
  await requirePermission("role.update");
  const supabase = await getSupabaseServerClient();
  const { data: role, error } = await supabase.from("roles").select("is_system_role").eq("id", roleId).maybeSingle();
  if (error) throw new Error("Role data could not be loaded.");
  if (!role) throw new RolePolicyError("Role was not found.");
  if (role.is_system_role) throw new RolePolicyError("System roles cannot be edited or deleted.");
  await assertMayGrantPermissions(await resolvePermissionGrantClosure(permissionKeys));
}

export async function assertMayDeleteRole(roleId: string) {
  await requirePermission("role.delete");
  const supabase = await getSupabaseServerClient();
  const { data: role, error } = await supabase.from("roles").select("is_system_role").eq("id", roleId).maybeSingle();
  if (error) throw new Error("Role data could not be loaded.");
  if (!role) throw new RolePolicyError("Role was not found.");
  if (role.is_system_role) throw new RolePolicyError("System roles cannot be edited or deleted.");
}

export async function assertMayChangeUserRole(targetUserId: string, newRolePermissionKeys: PermissionKey[]) {
  const { userId } = await getCurrentPermissionKeySet();
  if (targetUserId === userId) throw new RolePolicyError("You may not change your own role assignment.");
  await requirePermission("user.update");
  await assertMayGrantPermissions(newRolePermissionKeys);
}
