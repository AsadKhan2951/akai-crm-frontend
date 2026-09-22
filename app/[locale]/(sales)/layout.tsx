import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { requirePortal } from "@/lib/auth/portal";
import { ActivityFab } from "./sales/ActivityFab";
import { CallReturnSheet } from "./sales/CallReturnSheet";

export const dynamic = "force-dynamic";

export default async function SalesLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const { permissions } = await requirePortal("sales", locale);
  return <PermissionProvider permissions={permissions}><PortalShell portal="sales"><>{children}<ActivityFab /><CallReturnSheet /></></PortalShell></PermissionProvider>;
}
