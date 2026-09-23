"use client";

import { useEffect, type ReactNode } from "react";
import { Boxes, ClipboardCheck, Gift, GitBranch, Home, LayoutDashboard, ListTodo, LogOut, MessageSquareQuote, Settings, ShieldAlert, ShoppingCart, Truck, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui-kit/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { usePermissions } from "@/components/providers/PermissionProvider";
import type { PermissionKey } from "@/lib/auth/permissions";

export type PortalShellName = "admin" | "sales" | "vendor";

type NavKey = "overview" | "settings" | "profile" | "catalogue" | "cart" | "progress" | "enrichment" | "leads" | "customers" | "quotes" | "approvals" | "reports" | "recovery" | "communications" | "schemes" | "offers" | "delivery" | "points" | "rewards" | "claims" | "warranty" | "beats" | "beat" | "orders";
const navItems: ReadonlyArray<{ key: NavKey; path: string; icon: LucideIcon; permission?: PermissionKey; portals?: PortalShellName[] }> = [
  { key: "overview", path: "", icon: LayoutDashboard },
  { key: "approvals", path: "/approvals", icon: ClipboardCheck, permission: "order.approve", portals: ["admin"] },
  { key: "leads", path: "/leads", icon: GitBranch, permission: "lead.view", portals: ["sales"] },
  { key: "customers", path: "/customers", icon: Users, permission: "customer.view", portals: ["sales", "admin"] },
  { key: "quotes", path: "/quotes", icon: MessageSquareQuote, permission: "quote.view", portals: ["sales"] },
  { key: "recovery", path: "/recovery", icon: ClipboardCheck, permission: "collection.view", portals: ["sales", "admin"] },
  { key: "beat", path: "/beat", icon: ClipboardCheck, permission: "beat.view", portals: ["sales"] },
  { key: "communications", path: "/communications", icon: MessageSquareQuote, permission: "message.send", portals: ["admin"] },
  { key: "reports", path: "/reports", icon: GitBranch, permission: "report.build", portals: ["admin"] },
  { key: "schemes", path: "/schemes", icon: Gift, permission: "scheme.view", portals: ["admin"] },
  { key: "delivery", path: "/delivery", icon: Truck, permission: "delivery.view", portals: ["admin"] },
  { key: "beats", path: "/beats", icon: ClipboardCheck, permission: "beat.view", portals: ["admin"] },
  { key: "rewards", path: "/rewards", icon: Gift, permission: "reward.manage", portals: ["admin"] },
  { key: "claims", path: "/claims", icon: ShieldAlert, permission: "claim.view", portals: ["admin", "sales", "vendor"] },
  { key: "warranty", path: "/warranty", icon: ShieldAlert, permission: "warranty.manage", portals: ["admin", "sales"] },
  { key: "catalogue", path: "/catalogue", icon: Boxes, permission: "product.view", portals: ["admin", "vendor"] },
  { key: "offers", path: "/offers", icon: Gift, permission: "scheme.view", portals: ["vendor"] },
  { key: "points", path: "/points", icon: Gift, permission: "loyalty.view", portals: ["vendor"] },
  { key: "cart", path: "/cart", icon: ShoppingCart, permission: "order.create", portals: ["vendor"] },
  { key: "orders", path: "/orders", icon: ListTodo, permission: "order.view", portals: ["vendor"] },
  { key: "enrichment", path: "/customers/enrichment", icon: ClipboardCheck, permission: "customer.enrich", portals: ["sales"] },
  { key: "progress", path: "/customers/progress", icon: UsersRound, permission: "customer.view", portals: ["admin"] },
  { key: "settings", path: "/settings", icon: Settings, permission: "settings.manage", portals: ["admin"] },
  { key: "profile", path: "/profile", icon: UserRound, portals: ["admin", "vendor"] },
];

const mobileNav: Record<Exclude<PortalShellName, "admin">, ReadonlyArray<{ label: string; path: string; icon: LucideIcon }>> = {
  sales: [
    { label: "mobileToday", path: "/sales", icon: Home },
    { label: "mobileLeads", path: "/sales/leads", icon: GitBranch },
    { label: "mobileCustomers", path: "/sales/customers", icon: Users },
    { label: "mobileOrders", path: "/sales/orders/new", icon: ListTodo },
    { label: "mobileBeat", path: "/sales/beat", icon: ClipboardCheck },
  ],
  vendor: [
    { label: "mobileHome", path: "/vendor", icon: Home },
    { label: "mobileCatalogue", path: "/vendor/catalogue", icon: Boxes },
    { label: "mobileCart", path: "/vendor/cart", icon: ShoppingCart },
    { label: "mobileVendorOrders", path: "/vendor/orders", icon: ListTodo },
    { label: "points", path: "/vendor/points", icon: Gift },
  ],
};

export function PortalShell({ portal, children }: Readonly<{ portal: PortalShellName; children: ReactNode }>) {
  const locale = useLocale();
  const t = useTranslations("portal");
  const common = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const visibleNavItems = navItems.filter((item) => (!item.portals || item.portals.includes(portal)) && (!item.permission || can(item.permission)));

  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) manifest.href = `/${locale}${portal === "vendor" ? "/vendor" : ""}/manifest.webmanifest`;
  }, [locale, portal]);

  async function logout() {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "CLEAR_USER_SCOPE" }));
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="portal-shell">
      <aside className="hidden w-full shrink-0 flex-col border-b border-slate-200 bg-secondary/60 md:flex md:w-64 md:border-e md:border-b-0">
        <div className="flex items-center justify-between gap-3 p-4 md:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary font-bold text-white">A</span><div><p className="font-bold text-primary">{common("appName")}</p><p className="text-xs text-muted-foreground">{t(portal)}</p></div></div><LanguageSwitcher /></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-4" aria-label={t(portal)}>{visibleNavItems.map(({ key, path, icon: Icon }) => { const href = `/${portal}${path}`; const localizedHref = `/${locale}${href}`; const active = pathname === href || pathname === localizedHref; return <Button key={key} asChild variant={active ? "default" : "ghost"} className="shrink-0 justify-start gap-3"><Link href={href as never}><Icon className="h-4 w-4" aria-hidden="true" /><span>{t(key)}</span></Link></Button>; })}</nav>
        <div className="mt-auto hidden p-4 md:block"><Button type="button" variant="outline" className="w-full justify-start gap-3" onClick={() => void logout()}><LogOut className="h-4 w-4" aria-hidden="true" />{t("logout")}</Button></div>
      </aside>
      <div className="portal-main"><header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 md:px-8"><p className="text-sm font-semibold text-muted-foreground">{t("welcome", { portal: t(portal) })}</p><div className="flex items-center gap-2"><NotificationBell /><Button type="button" variant="ghost" className="md:hidden" onClick={() => void logout()}><LogOut className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{t("logout")}</span></Button></div></header><main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">{children}</main></div>
      {portal !== "admin" ? <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(22,35,63,0.08)] md:hidden" aria-label={t(portal)}>{mobileNav[portal].map(({ label, path, icon: Icon }) => { const active = pathname === path || pathname === `/${locale}${path}`; return <Link key={path} href={path as never} className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><span>{t(label)}</span></Link>; })}</nav> : null}
      {can("ai.chat") ? <AIAssistantWidget portal={portal} /> : null}
    </div>
  );
}
