import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ActivityFab } from "./sales/ActivityFab";
import { CallReturnSheet } from "./sales/CallReturnSheet";

export default function SalesLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <PortalShell portal="sales"><>{children}<ActivityFab /><CallReturnSheet /></></PortalShell>;
}
