import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { requirePortal } from "@/lib/auth/portal";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const { permissions } = await requirePortal("vendor", locale);
  return <PermissionProvider permissions={permissions}><PortalShell portal="vendor">{children}</PortalShell></PermissionProvider>;
}
