"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PermissionKey } from "@/lib/auth/permissions";

type PermissionContextValue = {
  permissions: ReadonlySet<string>;
  can: (permission: PermissionKey) => boolean;
};

const PermissionContext = createContext<PermissionContextValue>({
  permissions: new Set<string>(),
  can: () => false
});

export function PermissionProvider({ children, permissions = [] }: Readonly<{ children: ReactNode; permissions?: string[] }>) {
  const value = useMemo(() => {
    const set = new Set(permissions);
    return { permissions: set, can: (permission: PermissionKey) => set.has(permission) };
  }, [permissions]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionContext);
}
