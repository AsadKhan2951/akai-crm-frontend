import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/server";

export type PortalName = "admin" | "sales" | "vendor";

export type PortalAccess =
  | { status: "signed-out" }
  | { status: "no-access"; userId: string }
  | { status: "ok"; userId: string; portal: PortalName };

/** Landing page for each portal after login. */
export const PORTAL_HOME: Record<PortalName, string> = {
  admin: "/admin",
  sales: "/sales",
  vendor: "/vendor",
};

const PORTALS: ReadonlySet<string> = new Set(["admin", "sales", "vendor"]);

/** Resolves the signed-in user's portal from the permission tables (one cached call per request). */
export async function getPortalAccess(): Promise<PortalAccess> {
  const context = await getCurrentUserContext();
  if (!context) return { status: "signed-out" };
  if (!context.isActive || !context.roleActive || !context.portal || !PORTALS.has(context.portal)) return { status: "no-access", userId: context.userId };
  return { status: "ok", userId: context.userId, portal: context.portal as PortalName };
}

/** Server-side guard for portal layouts. Returns the user's permission keys for the client-side PermissionProvider. */
export async function requirePortal(portal: PortalName, locale: string) {
  const access = await getPortalAccess();
  if (access.status === "signed-out") redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/${portal}`)}`);
  if (access.status !== "ok" || access.portal !== portal) redirect(`/${locale}/unauthorized`);
  const context = (await getCurrentUserContext())!;
  return { userId: access.userId, permissions: context.permissions, context };
}

/** Only allow same-site, same-locale relative paths as post-login destinations. */
export function safeNextPath(next: string | null | undefined, locale: string) {
  if (!next || !next.startsWith(`/${locale}/`) || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
