import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { requirePortal } from "@/lib/auth/portal";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const { permissions } = await requirePortal("admin", locale);
  return <PermissionProvider permissions={permissions}><PortalShell portal="admin">{children}</PortalShell></PermissionProvider>;
}
