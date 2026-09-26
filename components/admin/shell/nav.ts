/** Sidebar structure. Every admin page lives here — nothing hidden behind Overview buttons.
 *  `perm` is the permission key from your role builder; hide items the user lacks. */
export type NavKey =
  | 'overview' | 'approvals' | 'orders' | 'quotes' | 'delivery'
  | 'customers' | 'beats' | 'visits' | 'team' | 'enrichment'
  | 'recovery' | 'ledger'
  | 'schemes' | 'rewards' | 'communications' | 'catalogue'
  | 'claims' | 'warranty'
  | 'reports' | 'users' | 'roles' | 'access' | 'audit' | 'settings';

export interface NavItem { key: NavKey; href: string; perm?: string; badge?: 'approvals' | 'recovery' | 'enrichment' }
export interface NavGroup { key: 'operations' | 'field' | 'finance' | 'growth' | 'afterSales' | 'admin'; items: NavItem[] }

export const NAV: NavGroup[] = [
  { key: 'operations', items: [
    { key: 'overview', href: '/admin', perm: 'dashboard.view' },
    { key: 'approvals', href: '/admin/approvals', perm: 'order.approve', badge: 'approvals' },
    { key: 'orders', href: '/admin/orders', perm: 'order.view' },
    { key: 'quotes', href: '/admin/quotes', perm: 'quote.view' },
    { key: 'delivery', href: '/admin/delivery', perm: 'delivery.view' },
  ] },
  { key: 'field', items: [
    { key: 'customers', href: '/admin/customers', perm: 'customer.view' },
    { key: 'beats', href: '/admin/beats', perm: 'beat.view' },
    { key: 'visits', href: '/admin/visits', perm: 'activity.view' },
    { key: 'team', href: '/admin/team', perm: 'dashboard.view' },
    { key: 'enrichment', href: '/admin/customers/progress', perm: 'customer.view', badge: 'enrichment' },
  ] },
  { key: 'finance', items: [
    { key: 'recovery', href: '/admin/recovery', perm: 'collection.view', badge: 'recovery' },
    { key: 'ledger', href: '/admin/ledger', perm: 'ledger.view' },
  ] },
  { key: 'growth', items: [
    { key: 'schemes', href: '/admin/schemes', perm: 'scheme.view' },
    { key: 'rewards', href: '/admin/rewards', perm: 'reward.manage' },
    { key: 'communications', href: '/admin/communications', perm: 'message.send' },
    { key: 'catalogue', href: '/admin/catalogue', perm: 'product.view' },
  ] },
  { key: 'afterSales', items: [
    { key: 'claims', href: '/admin/claims', perm: 'claim.view' },
    { key: 'warranty', href: '/admin/warranty', perm: 'warranty.manage' },
  ] },
  { key: 'admin', items: [
    { key: 'reports', href: '/admin/reports', perm: 'report.build' },
    { key: 'users', href: '/admin/users', perm: 'user.view' },
    { key: 'roles', href: '/admin/settings/roles', perm: 'role.view' },
    { key: 'access', href: '/admin/access', perm: 'role.view' },
    { key: 'audit', href: '/admin/audit', perm: 'auditlog.view' },
    { key: 'settings', href: '/admin/settings', perm: 'settings.manage' },
  ] },
];

/** Longest-prefix match so /admin/customers/progress highlights Data quality, not Customers. */
export function activeKey(pathname: string): NavKey | null {
  if (pathname.startsWith('/admin/settings/roles')) return 'roles';
  const all = NAV.flatMap((g) => g.items);
  const hit = all.filter((i) => pathname === i.href || pathname.startsWith(i.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
  return hit?.key ?? null;
}
