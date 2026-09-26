import type { ReactNode } from "react";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { AdminSidebar } from "@/components/admin/shell/AdminSidebar";
import { AdminTopbar } from "@/components/admin/shell/AdminTopbar";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { ManifestSwitcher } from "@/components/pwa/ManifestSwitcher";
import { requirePortal } from "@/lib/auth/portal";
import { getCurrentAdmin, getNavBadges } from "@/lib/admin/ops";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const { permissions } = await requirePortal("admin", locale);
  const [me, badges] = await Promise.all([getCurrentAdmin(), getNavBadges()]);
  const user = { name: me?.name ?? "Admin", role: me?.role ?? "", initials: me?.initials ?? "A" };
  return (
    <PermissionProvider permissions={permissions}>
      <ManifestSwitcher portal="admin" />
      <div className="flex min-h-dvh bg-canvas text-ink">
        <AdminSidebar badges={badges} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar badges={badges} user={user} />
          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-7 md:pb-10">{children}</main>
        </div>
      </div>
      {permissions.includes("ai.chat") ? <AIAssistantWidget portal="admin" /> : null}
    </PermissionProvider>
  );
}
