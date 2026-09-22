import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";

export default function VendorLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <PortalShell portal="vendor">{children}</PortalShell>;
}
