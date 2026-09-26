"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { Boxes, ClipboardCheck, Gift, GitBranch, Home, LayoutDashboard, ListTodo, LogOut, MessageSquareQuote, Settings, ShieldAlert, ShoppingCart, Truck, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LocaleSwitch } from "@/components/admin/shell/LocaleSwitch";
import { NotificationBell } from "@/components/NotificationBell";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { usePermissions } from "@/components/providers/PermissionProvider";
import type { PermissionKey } from "@/lib/auth/permissions";

export type PortalShellName = "admin" | "sales" | "vendor";
type ShellPortal = Exclude<PortalShellName, "admin">;

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

export function PortalShell({ portal, children }: Readonly<{ portal: ShellPortal; children: ReactNode }>) {
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
    <div className="portal-shell bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-e border-line bg-[#fbfbf9] md:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink font-sans text-[15px] font-bold text-white">A</span>
          <div className="flex flex-col leading-tight"><span className="font-sans text-[15px] font-bold">{common("appName")}</span><span className="text-xs text-muted">{t(portal)}</span></div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3" aria-label={t(portal)}>
          {visibleNavItems.map(({ key, path, icon: Icon }) => {
            const href = `/${portal}${path}`;
            const active = path === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={key} href={href as never} aria-current={active ? "page" : undefined}
                className={`flex min-h-[36px] items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] ${active ? "bg-ink font-semibold text-white" : "font-medium text-[#2b2f37] hover:bg-[#f0efeb]"}`}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{t(key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          <button type="button" onClick={() => void logout()} className="flex min-h-[36px] w-full items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] font-medium text-[#2b2f37] hover:bg-[#f0efeb]"><LogOut className="h-4 w-4" aria-hidden="true" />{t("logout")}</button>
        </div>
      </aside>
      <div className="portal-main flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:h-16 md:px-8">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink font-sans text-[15px] font-bold text-white md:hidden">A</span>
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-muted">{t("welcome", { portal: t(portal) })}</p>
          <Suspense fallback={null}><LocaleSwitch compact /></Suspense>
          <NotificationBell />
          <button type="button" onClick={() => void logout()} aria-label={t("logout")} className="flex size-[38px] items-center justify-center rounded-lg border border-line bg-surface hover:bg-sunken md:hidden"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-28 md:p-8">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 md:hidden" aria-label={t(portal)}>
        {mobileNav[portal].map(({ label, path, icon: Icon }) => {
          const active = pathname === path || (path !== `/${portal}` && pathname.startsWith(`${path}/`));
          return (
            <Link key={path} href={path as never} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center text-[11.5px] ${active ? "font-bold text-ink" : "font-medium text-muted"}`}>
              <span className={`block h-1 w-7 rounded-full ${active ? "bg-ink" : "bg-transparent"}`} />
              <Icon className="h-5 w-5" aria-hidden="true" /><span className="leading-tight">{t(label)}</span>
            </Link>
          );
        })}
      </nav>
      {can("ai.chat") ? <AIAssistantWidget portal={portal} /> : null}
    </div>
  );
}
