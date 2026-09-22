import "server-only";

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

export async function getCurrentUserPermissionKeys() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as string[];

  const { data, error } = await supabase.rpc("permission_keys", { uid: user.id });
  if (error) throw new Error("Permission data could not be loaded.");
  return (data ?? []).map((row: { permission_key: string }) => row.permission_key);
}

export async function hasCurrentUserPermission(permission: PermissionKey) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_permission", { uid: user.id, perm: permission });
  return !error && data === true;
}

export async function requirePermission(permission: PermissionKey, options?: { asNotFound?: boolean }) {
  const allowed = await hasCurrentUserPermission(permission);
  if (!allowed) {
    if (options?.asNotFound) notFound();
    throw new PermissionDeniedError(permission);
  }
}
