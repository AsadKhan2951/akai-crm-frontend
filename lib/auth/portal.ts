import "server-only";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserPermissionKeys } from "@/lib/auth/server";

export type PortalName = "admin" | "sales" | "vendor";

export type PortalAccess =
  | { status: "signed-out" }
  | { status: "no-access"; userId: string }
  | { status: "ok"; userId: string; portal: PortalName };

/** Landing page for each portal after login. */
export const PORTAL_HOME: Record<PortalName, string> = {
  admin: "/admin",
  sales: "/sales",
  // The Vendor home page is missing from the recovered source; send vendors to an existing page for now.
  vendor: "/vendor/offers",
};

const PORTALS: ReadonlySet<string> = new Set(["admin", "sales", "vendor"]);

/** Resolves the signed-in user's portal from the permission tables (RLS: a user can read their own row and role). */
export async function getPortalAccess(): Promise<PortalAccess> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };

  const { data: profile } = await supabase.from("users").select("role_id,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || !profile.role_id) return { status: "no-access", userId: user.id };

  const { data: role } = await supabase.from("roles").select("portal_access,is_active").eq("id", profile.role_id).maybeSingle();
  const portal = String(role?.portal_access ?? "").toLowerCase();
  if (!role?.is_active || !PORTALS.has(portal)) return { status: "no-access", userId: user.id };

  return { status: "ok", userId: user.id, portal: portal as PortalName };
}

/** Server-side guard for portal layouts. Returns the user's permission keys for the client-side PermissionProvider. */
export async function requirePortal(portal: PortalName, locale: string) {
  const access = await getPortalAccess();
  if (access.status === "signed-out") redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/${portal}`)}`);
  if (access.status !== "ok" || access.portal !== portal) redirect(`/${locale}/unauthorized`);
  const permissions = await getCurrentUserPermissionKeys();
  return { userId: access.userId, permissions };
}

/** Only allow same-site, same-locale relative paths as post-login destinations. */
export function safeNextPath(next: string | null | undefined, locale: string) {
  if (!next || !next.startsWith(`/${locale}/`) || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
