import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <PortalShell portal="admin">{children}</PortalShell>;
}
