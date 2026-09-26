import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/lib/auth/permissions";

export class PermissionDeniedError extends Error {
  readonly code = "FORBIDDEN";
  constructor(permission: PermissionKey) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

export type CurrentUserContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  roleName: string | null;
  portal: string | null;
  dataScope: string | null;
  isActive: boolean;
  roleActive: boolean;
  permissions: string[];
};

/** The signed-in auth user, fetched once per request. */
export const getAuthUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Profile, role, portal and permission keys in one database call (current_user_context RPC),
 * shared by the layout, the page and every permission check in the same request.
 * Falls back to the older per-table reads if the RPC is not deployed yet.
 */
export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("current_user_context");
  if (!error) {
    if (!data) return { userId: user.id, email: user.email ?? null, fullName: null, roleName: null, portal: null, dataScope: null, isActive: false, roleActive: false, permissions: [] };
    const row = data as Record<string, unknown>;
    return {
      userId: user.id,
      email: (row.email as string | null) ?? user.email ?? null,
      fullName: (row.full_name as string | null) ?? null,
      roleName: (row.role_name as string | null) ?? null,
      portal: (row.portal as string | null) ?? null,
      dataScope: (row.data_scope as string | null) ?? null,
      isActive: row.is_active === true,
      roleActive: row.role_active === true,
      permissions: Array.isArray(row.permissions) ? (row.permissions as string[]) : [],
    };
  }

  // Fallback for databases without migration 0066.
  const [{ data: profile }, { data: keys, error: keysError }] = await Promise.all([
    supabase.from("users").select("email,full_name,role_id,is_active").eq("id", user.id).maybeSingle(),
    supabase.rpc("permission_keys", { uid: user.id }),
  ]);
  if (keysError) throw new Error("Permission data could not be loaded.");
  const { data: role } = profile?.role_id
    ? await supabase.from("roles").select("name,portal_access,data_scope,is_active").eq("id", profile.role_id).maybeSingle()
    : { data: null };
  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    roleName: role?.name ?? null,
    portal: role?.portal_access ? String(role.portal_access).toLowerCase() : null,
    dataScope: role?.data_scope ? String(role.data_scope) : null,
    isActive: profile?.is_active === true,
    roleActive: role?.is_active === true,
    permissions: (keys ?? []).map((row: { permission_key: string }) => row.permission_key),
  };
});

const getPermissionSet = cache(async () => new Set((await getCurrentUserContext())?.permissions ?? []));

export async function getCurrentUserPermissionKeys() {
  return [...(await getPermissionSet())];
}

export async function hasCurrentUserPermission(permission: PermissionKey) {
  return (await getPermissionSet()).has(permission);
}

export async function requirePermission(permission: PermissionKey, options?: { asNotFound?: boolean }) {
  const allowed = await hasCurrentUserPermission(permission);
  if (!allowed) {
    if (options?.asNotFound) notFound();
    throw new PermissionDeniedError(permission);
  }
}
